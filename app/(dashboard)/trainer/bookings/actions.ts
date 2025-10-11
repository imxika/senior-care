'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { BOOKING_STATUS } from '@/lib/constants'
import { combineDateTime } from '@/lib/utils'

export async function updateBookingStatus(
  bookingId: string,
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show',
  rejectionReason?: 'personal_emergency' | 'health_issue' | 'schedule_conflict' | 'distance_too_far' | 'customer_requirements' | 'other',
  rejectionNote?: string
) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: '로그인이 필요합니다.' }
  }

  // Get trainer.id from profile_id (docs/DATABASE_SCHEMA.md 참조)
  const { data: trainer } = await supabase
    .from('trainers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!trainer) {
    return { error: '트레이너 정보를 찾을 수 없습니다.' }
  }

  // RLS를 우회하기 위해 Service Role 사용 (고객 정보 조회용)
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Get booking with customer and trainer info (올바른 FK 참조)
  const { data: booking, error: fetchError } = await serviceSupabase
    .from('bookings')
    .select(`
      *,
      customer:customers!bookings_customer_id_fkey(
        id,
        profile:profiles!customers_profile_id_fkey(id, full_name)
      ),
      trainer:trainers!bookings_trainer_id_fkey(
        id,
        profile:profiles!trainers_profile_id_fkey(full_name)
      )
    `)
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    return { error: '예약을 찾을 수 없습니다.' }
  }

  // 올바른 권한 체크: booking.trainer_id vs trainer.id
  if (booking.trainer_id !== trainer.id) {
    return { error: '권한이 없습니다.' }
  }

  // 🆕 승인 시: Payment Intent Capture (카드에서 실제 청구)
  if (status === 'confirmed') {
    const { data: payments } = await serviceSupabase
      .from('payments')
      .select('id, payment_status, amount, payment_provider, payment_metadata')
      .eq('booking_id', bookingId)
      .eq('payment_status', 'authorized') // Hold 상태

    if (payments && payments.length > 0) {
      for (const payment of payments) {
        try {
          console.log('💳 [TRAINER APPROVE] Capturing payment:', payment.id)

          if (payment.payment_provider === 'stripe') {
            const Stripe = (await import('stripe')).default
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
              apiVersion: '2025-09-30.clover',
            })

            const paymentIntentId = payment.payment_metadata?.stripePaymentIntentId

            if (paymentIntentId) {
              // Payment Intent Capture (실제 청구)
              const capturedIntent = await stripe.paymentIntents.capture(paymentIntentId)
              console.log('✅ [TRAINER APPROVE] Payment captured:', capturedIntent.id)

              // DB 업데이트
              await serviceSupabase
                .from('payments')
                .update({
                  payment_status: 'paid',
                  paid_at: new Date().toISOString(),
                  payment_metadata: {
                    ...payment.payment_metadata,
                    capturedAt: new Date().toISOString(),
                    capturedAmount: capturedIntent.amount_received,
                    stripeChargeId: capturedIntent.latest_charge,
                  }
                })
                .eq('id', payment.id)

              // payment_events 기록
              await serviceSupabase.rpc('log_payment_event', {
                p_payment_id: payment.id,
                p_event_type: 'confirmed',
                p_metadata: {
                  capturedAt: new Date().toISOString(),
                  stripePaymentIntentId: paymentIntentId,
                  capturedAmount: capturedIntent.amount_received,
                  capturedByTrainer: trainer.id,
                }
              })
            }
          }
          // Toss는 기존 방식 유지 (즉시 결제)
        } catch (captureError) {
          console.error('❌ [TRAINER APPROVE] Capture error:', captureError)
          return { error: '결제 처리 중 오류가 발생했습니다.' }
        }
      }
    }
  }

  // Update booking status
  interface BookingUpdateData {
    status: string
    updated_at: string
    matching_status?: string
    rejection_reason?: string
    rejection_note?: string
  }

  const updateData: BookingUpdateData = {
    status,
    updated_at: new Date().toISOString()
  }

  // 추천 예약 승인 시 matching_status 업데이트
  if (status === 'confirmed' && booking.booking_type === 'recommended') {
    updateData.matching_status = 'approved'
  }

  // 거절 시 사유 추가
  if (status === 'cancelled' && rejectionReason) {
    updateData.rejection_reason = rejectionReason
    if (rejectionNote) {
      updateData.rejection_note = rejectionNote
    }
  }

  const { error: updateError } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', bookingId)

  if (updateError) {
    console.error('Booking update error:', updateError)
    console.error('Error details:', {
      message: updateError.message,
      code: updateError.code,
      details: updateError.details,
      hint: updateError.hint
    })
    return { error: `예약 상태 업데이트 중 오류: ${updateError.message}` }
  }

  // 🆕 거절 시: Payment Intent Cancel (환불 불필요!)
  if (status === 'cancelled') {
    // 결제 내역 조회
    const { data: payments } = await serviceSupabase
      .from('payments')
      .select('id, payment_status, amount, payment_provider, payment_metadata')
      .eq('booking_id', bookingId)
      .in('payment_status', ['authorized', 'paid']) // Hold 또는 이미 청구된 경우

    // 결제 처리
    if (payments && payments.length > 0) {
      for (const payment of payments) {
        try {
          console.log('💰 [TRAINER REJECT] Processing payment:', payment.id, payment.payment_status)

          // Stripe
          if (payment.payment_provider === 'stripe') {
            const Stripe = (await import('stripe')).default
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
              apiVersion: '2025-09-30.clover',
            })

            const paymentIntentId = payment.payment_metadata?.stripePaymentIntentId

            if (paymentIntentId) {
              // authorized 상태면 Cancel (환불 불필요!)
              if (payment.payment_status === 'authorized') {
                const cancelledIntent = await stripe.paymentIntents.cancel(paymentIntentId, {
                  cancellation_reason: 'requested_by_customer',
                })
                console.log('✅ [TRAINER REJECT] Payment Intent cancelled (no charge):', cancelledIntent.id)

                // DB 업데이트
                await serviceSupabase
                  .from('payments')
                  .update({
                    payment_status: 'cancelled',
                    payment_metadata: {
                      ...payment.payment_metadata,
                      cancelledAt: new Date().toISOString(),
                      cancellationReason: `트레이너 예약 거절 (사유: ${rejectionReason})${rejectionNote ? ` - ${rejectionNote}` : ''}`,
                      cancelledByTrainer: trainer.id,
                    }
                  })
                  .eq('id', payment.id)

                // payment_events 기록
                await serviceSupabase.rpc('log_payment_event', {
                  p_payment_id: payment.id,
                  p_event_type: 'cancelled',
                  p_metadata: {
                    cancelledAt: new Date().toISOString(),
                    cancellationReason: `트레이너 예약 거절`,
                    cancelledByTrainer: trainer.id,
                  }
                })
              }
              // paid 상태면 Refund (이미 청구됨)
              else if (payment.payment_status === 'paid') {
                const refund = await stripe.refunds.create({
                  payment_intent: paymentIntentId,
                  reason: 'requested_by_customer',
                  metadata: {
                    refund_reason: `트레이너 예약 거절 (사유: ${rejectionReason})${rejectionNote ? ` - ${rejectionNote}` : ''}`,
                    refunded_by_trainer: trainer.id,
                    refunded_at: new Date().toISOString(),
                  }
                })
                console.log('✅ [TRAINER REJECT] Payment refunded:', refund.id)

                // DB 업데이트
                await serviceSupabase
                  .from('payments')
                  .update({
                    payment_status: 'refunded',
                    refunded_at: new Date().toISOString(),
                    payment_metadata: {
                      ...payment.payment_metadata,
                      refund: {
                        reason: `트레이너 예약 거절 (사유: ${rejectionReason})${rejectionNote ? ` - ${rejectionNote}` : ''}`,
                        refundedByTrainer: trainer.id,
                        refundedAt: new Date().toISOString(),
                      }
                    }
                  })
                  .eq('id', payment.id)
              }
            }
          }
          // Toss Payments 환불
          else if (payment.payment_provider === 'toss') {
            const paymentKey = payment.payment_metadata?.paymentKey

            if (paymentKey) {
              const tossResponse = await fetch(
                `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64')}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    cancelReason: `트레이너 예약 거절 (사유: ${rejectionReason})${rejectionNote ? ` - ${rejectionNote}` : ''}`
                  })
                }
              )

              if (tossResponse.ok) {
                const tossData = await tossResponse.json()
                console.log('✅ Toss refund successful:', tossData.transactionKey)

                // DB 업데이트
                await serviceSupabase
                  .from('payments')
                  .update({
                    payment_status: 'refunded',
                    refunded_at: new Date().toISOString(),
                    payment_metadata: {
                      ...payment.payment_metadata,
                      refund: {
                        reason: `트레이너 예약 거절 (사유: ${rejectionReason})${rejectionNote ? ` - ${rejectionNote}` : ''}`,
                        refundedByTrainer: trainer.id,
                        refundedAt: new Date().toISOString(),
                      }
                    }
                  })
                  .eq('id', payment.id)
              } else {
                console.error('❌ Toss refund failed:', await tossResponse.json())
              }
            }
          }

        } catch (paymentError) {
          console.error('❌ [TRAINER REJECT] Payment processing error:', paymentError)
          // 환불/취소 실패해도 예약 거절은 계속 진행 (관리자가 수동 처리)
        }
      }
    }
  }

  // Create notification for customer (utils 사용)
  const trainerName = booking.trainer?.profile?.full_name || '트레이너'
  const scheduledAt = combineDateTime(booking.booking_date, booking.start_time)
  const customerProfileId = booking.customer?.profile?.id

  console.log('📤 Sending notification to customer:', customerProfileId)
  console.log('📤 Trainer name:', trainerName)
  console.log('📤 Scheduled at:', scheduledAt)
  console.log('📤 Status:', status)

  if (!customerProfileId) {
    console.error('❌ Customer profile_id not found for notification')
  } else {
    try {
      if (status === 'confirmed') {
        const notification = notificationTemplates.bookingConfirmed(trainerName, scheduledAt)
        console.log('📤 Creating notification:', notification)
        const result = await createNotification({
          userId: customerProfileId,
          ...notification,
          link: `/customer/bookings/${bookingId}`
        })
        console.log('✅ Notification created:', result)
      } else if (status === 'cancelled') {
        const notification = notificationTemplates.bookingRejected(trainerName)
        const result = await createNotification({
          userId: customerProfileId,
          ...notification,
          link: `/customer/bookings/${bookingId}`
        })
        console.log('✅ Notification created:', result)
      } else if (status === 'completed') {
        const notification = notificationTemplates.bookingCompleted(trainerName)
        const result = await createNotification({
          userId: customerProfileId,
          ...notification,
          link: `/customer/bookings/${bookingId}`
        })
        console.log('✅ Notification created:', result)
      }
    } catch (error) {
      console.error('❌ Failed to create notification:', error)
    }
  }

  // 페이지 갱신
  revalidatePath('/trainer/bookings')
  revalidatePath(`/trainer/bookings/${bookingId}`)

  return { success: true }
}
