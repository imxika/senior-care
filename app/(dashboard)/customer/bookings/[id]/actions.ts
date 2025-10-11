'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { CancellationReason } from '@/lib/constants'
import { calculateCancellationFee } from '@/lib/utils'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
})

export async function cancelBooking(
  bookingId: string,
  reason: CancellationReason,
  notes?: string
) {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  // 고객 정보 확인
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!customer || customerError) {
    console.error('Customer lookup error:', customerError)
    return { error: '고객 정보를 찾을 수 없습니다.' }
  }

  // 예약 정보 조회
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('customer_id', customer.id)
    .single()

  if (bookingError || !booking) {
    console.error('Booking lookup error:', {
      error: bookingError,
      message: bookingError?.message,
      details: bookingError?.details,
      bookingId,
      customerId: customer.id
    })
    return { error: '예약 정보를 찾을 수 없습니다.' }
  }

  // 이미 취소된 예약인지 확인
  if (booking.status === 'cancelled') {
    return { error: '이미 취소된 예약입니다.' }
  }

  // 완료된 예약은 취소 불가
  if (booking.status === 'completed') {
    return { error: '완료된 예약은 취소할 수 없습니다.' }
  }

  // 취소 수수료 계산
  const cancellationInfo = calculateCancellationFee(
    booking.total_price,
    booking.booking_date,
    booking.start_time
  )

  // 취소 사유 및 수수료 정보를 customer_notes에 추가
  const cancellationDetails = `
[취소 정보]
취소 사유: ${reason}
${notes ? `상세 사유: ${notes}\n` : ''}취소 시기: ${cancellationInfo.timeCategory}
취소 수수료: ${cancellationInfo.feeAmount.toLocaleString()}원 (${(cancellationInfo.feeRate * 100).toFixed(0)}%)
환불 금액: ${cancellationInfo.refundAmount.toLocaleString()}원
취소 일시: ${new Date().toLocaleString('ko-KR')}
`

  const updatedNotes = booking.customer_notes
    ? `${booking.customer_notes}\n\n${cancellationDetails}`
    : cancellationDetails

  // 결제 정보 조회 (authorized 또는 paid 상태)
  const { data: payments } = await supabase
    .from('payments')
    .select('id, payment_status, payment_provider, payment_metadata, amount, currency, payment_method, created_at')
    .eq('booking_id', bookingId)
    .in('payment_status', ['authorized', 'paid'])

  console.log('결제 정보 조회:', { bookingId, paymentsFound: payments?.length || 0, payments })

  // 예약 상태를 cancelled로 변경
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      customer_notes: updatedNotes,
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)

  if (updateError) {
    console.error('Failed to cancel booking:', {
      error: updateError,
      message: updateError?.message,
      details: updateError?.details,
      hint: updateError?.hint,
      code: updateError?.code,
      bookingId
    })
    return { error: `예약 취소에 실패했습니다: ${updateError?.message || '알 수 없는 오류'}` }
  }

  // 결제 환불 처리 (결제가 있는 경우만)
  if (payments && payments.length > 0) {
    const paidPayment = payments[0]

    try {
      // Service Role로 환불 처리
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

      let refundResult: {
        refundId: string
        amount: number
        status: string
        provider: string
      } | null = null

      // Stripe 처리
      if (paidPayment.payment_provider === 'stripe') {
        const metadata = paidPayment.payment_metadata as Record<string, unknown> | null
        const paymentIntentId = metadata?.stripePaymentIntentId as string | undefined

        console.log('💳 [STRIPE] Payment metadata:', {
          hasMetadata: !!paidPayment.payment_metadata,
          paymentIntentId,
          paymentStatus: paidPayment.payment_status,
          metadata: paidPayment.payment_metadata,
          metadataKeys: metadata ? Object.keys(metadata) : []
        })

        if (paymentIntentId && typeof paymentIntentId === 'string') {
          // 🆕 authorized 상태면 Partial Capture (수수료만 청구)
          if (paidPayment.payment_status === 'authorized') {
            const feeAmountInCents = Math.round(cancellationInfo.feeAmount)

            console.log('💸 [STRIPE PARTIAL CAPTURE] Capturing cancellation fee:', {
              paymentIntentId,
              feeAmount: cancellationInfo.feeAmount,
              feeAmountInCents,
              feeRate: cancellationInfo.feeRate
            })

            if (feeAmountInCents > 0) {
              // 수수료만 청구
              const capturedIntent = await stripe.paymentIntents.capture(paymentIntentId, {
                amount_to_capture: feeAmountInCents
              })

              refundResult = {
                refundId: capturedIntent.id,
                amount: cancellationInfo.refundAmount, // 환불액 (청구 안 된 금액)
                status: 'partial_capture',
                provider: 'stripe'
              }

              console.log('✅ [STRIPE PARTIAL CAPTURE] Fee captured:', {
                capturedAmount: capturedIntent.amount_received,
                refundedAmount: cancellationInfo.refundAmount
              })

              // DB 업데이트 - paid 상태로 변경 (수수료는 청구됨)
              await serviceSupabase
                .from('payments')
                .update({
                  payment_status: 'paid',
                  paid_at: new Date().toISOString(),
                  payment_metadata: {
                    ...metadata,
                    partialCapture: {
                      capturedAmount: capturedIntent.amount_received,
                      refundedAmount: cancellationInfo.refundAmount,
                      feeRate: cancellationInfo.feeRate,
                      reason: `고객 예약 취소 - ${reason}`,
                      capturedAt: new Date().toISOString()
                    }
                  }
                })
                .eq('id', paidPayment.id)
            } else {
              // 수수료 0원이면 Cancel (전액 환불)
              const cancelledIntent = await stripe.paymentIntents.cancel(paymentIntentId)

              refundResult = {
                refundId: cancelledIntent.id,
                amount: cancellationInfo.refundAmount,
                status: 'cancelled',
                provider: 'stripe'
              }

              console.log('✅ [STRIPE CANCEL] Payment Intent cancelled (no fee):', cancelledIntent.id)

              await serviceSupabase
                .from('payments')
                .update({
                  payment_status: 'cancelled',
                  payment_metadata: {
                    ...metadata,
                    cancelled: {
                      cancelledAt: new Date().toISOString(),
                      reason: `고객 예약 취소 - ${reason} (수수료 0%)`
                    }
                  }
                })
                .eq('id', paidPayment.id)
            }
          }
          // paid 상태면 기존 환불 로직 (부분 환불)
          else if (paidPayment.payment_status === 'paid') {
            const refundAmountInCents = Math.round(cancellationInfo.refundAmount)

            console.log('💸 [STRIPE REFUND] Creating refund:', {
              paymentIntentId,
              refundAmount: cancellationInfo.refundAmount,
              refundAmountInCents
            })

            const refund = await stripe.refunds.create({
              payment_intent: paymentIntentId,
              amount: refundAmountInCents,
              reason: 'requested_by_customer',
              metadata: {
                refund_reason: `고객 예약 취소 - ${reason}`,
                booking_id: bookingId,
                customer_id: customer.id,
                refunded_at: new Date().toISOString()
              }
            })

            refundResult = {
              refundId: refund.id,
              amount: refund.amount,
              status: refund.status || 'succeeded',
              provider: 'stripe'
            }

            console.log('✅ [STRIPE REFUND] Refund completed:', refundResult)
          }
        } else {
          console.error('❌ [STRIPE] No paymentIntentId found in metadata')
        }
      }
      // Toss 환불
      else if (paidPayment.payment_provider === 'toss') {
        const metadata = paidPayment.payment_metadata as Record<string, unknown> | null
        const paymentKey = metadata?.paymentKey as string | undefined

        console.log('💳 [TOSS REFUND] Payment metadata:', {
          hasMetadata: !!paidPayment.payment_metadata,
          paymentKey,
          metadata: paidPayment.payment_metadata,
          metadataKeys: metadata ? Object.keys(metadata) : []
        })

        if (paymentKey && typeof paymentKey === 'string') {
          const tossResponse = await fetch(
            `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                cancelReason: `고객 예약 취소 - ${reason}`,
                cancelAmount: Math.round(cancellationInfo.refundAmount)
              })
            }
          )

          if (tossResponse.ok) {
            const tossData = await tossResponse.json()
            refundResult = {
              refundId: tossData.transactionKey,
              amount: tossData.cancels?.[0]?.cancelAmount || cancellationInfo.refundAmount,
              status: tossData.status,
              provider: 'toss'
            }

            console.log('Toss 환불 완료:', refundResult)
          } else {
            console.error('Toss 환불 실패:', await tossResponse.text())
          }
        }
      }

      // 기존 결제 레코드를 환불 상태로 업데이트 (Admin 방식과 동일)
      if (refundResult) {
        const { error: updateError } = await serviceSupabase
          .from('payments')
          .update({
            payment_status: 'refunded',
            refunded_at: new Date().toISOString(),
            payment_metadata: {
              ...paidPayment.payment_metadata,
              refund: {
                ...refundResult,
                reason: `고객 예약 취소 - ${reason}`,
                refundedBy: customer.id,
                refundedAt: new Date().toISOString(),
                cancellationFee: cancellationInfo.feeAmount,
                refundAmount: cancellationInfo.refundAmount
              }
            }
          })
          .eq('id', paidPayment.id)

        if (updateError) {
          console.error('환불 레코드 업데이트 실패:', updateError)
        } else {
          console.log('환불 레코드 업데이트 완료')
        }
      }

    } catch (refundError) {
      console.error('환불 처리 중 오류:', refundError)
      // 환불 실패해도 예약은 취소됨 - 관리자가 수동 환불 필요
    }
  }

  // 트레이너에게 알림 전송 (트레이너가 배정된 경우만)
  if (booking.trainer_id) {
    const { data: trainer } = await supabase
      .from('trainers')
      .select('profile_id')
      .eq('id', booking.trainer_id)
      .single()

    if (trainer) {
      await supabase.from('notifications').insert({
        user_id: trainer.profile_id,
        title: '예약 취소 알림',
        message: `고객이 ${booking.booking_date} ${booking.start_time.slice(0, 5)} 예약을 취소했습니다.\n취소 사유: ${reason}`,
        type: 'booking_cancelled',
        link: `/trainer/bookings/${bookingId}`,
        is_read: false
      })
    }
  }

  // 페이지 재검증
  revalidatePath(`/customer/bookings/${bookingId}`)
  revalidatePath('/customer/bookings')

  return {
    success: true,
    refundAmount: cancellationInfo.refundAmount,
    feeAmount: cancellationInfo.feeAmount
  }
}
