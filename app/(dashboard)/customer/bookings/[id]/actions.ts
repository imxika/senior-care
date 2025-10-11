'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { calculateCancellationFee } from '@/lib/cancellation-fee'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import type { CancellationReason } from '@/lib/constants'

/**
 * 고객 예약 취소 (서버 액션)
 * 취소 시점에 따라 수수료 차등 적용:
 * - 7일 이상 전: Payment Intent 완전 취소 (0% 수수료)
 * - 7일 이내: Partial Capture로 수수료만 청구
 */
export async function cancelBooking(
  bookingId: string,
  reason: CancellationReason,
  notes?: string
) {
  try {
    const supabase = await createClient()

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // 2. 예약 조회
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      console.error('❌ [CANCEL] Booking not found:', bookingError)
      return { error: 'Booking not found' }
    }

    // 3. Customer 조회 및 권한 확인
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('profile_id')
      .eq('id', booking.customer_id)
      .single()

    if (customerError || !customer) {
      console.error('❌ [CANCEL] Customer not found:', customerError)
      return { error: 'Customer not found' }
    }

    if (customer.profile_id !== user.id) {
      return { error: 'Forbidden' }
    }

    // 4. 예약 상태 확인
    if (booking.status === 'cancelled') {
      return { error: 'Already cancelled' }
    }

    if (booking.status === 'completed') {
      return { error: 'Cannot cancel completed booking' }
    }

    // 5. 결제 정보 조회
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('payment_provider', 'stripe')
      .single()

    if (paymentError || !payment) {
      console.error('❌ [CANCEL] Payment not found:', paymentError)
      return { error: 'Payment not found' }
    }

    // 6. Payment Intent ID 추출
    const metadata = payment.payment_metadata as Record<string, unknown>
    const paymentIntentId = metadata?.stripePaymentIntentId as string

    if (!paymentIntentId) {
      console.error('❌ [CANCEL] Payment Intent ID not found in metadata')
      return { error: 'Payment Intent ID not found' }
    }

    // 7. 취소 수수료 계산
    const bookingDateTime = `${booking.booking_date}T${booking.start_time}`
    const totalAmount = payment.amount

    const feeCalculation = calculateCancellationFee(bookingDateTime, totalAmount)

    if (!feeCalculation.canCancel) {
      return {
        error: 'Cannot cancel',
        reason: feeCalculation.cancellationReason
      }
    }

    console.log('💰 [CANCEL] Fee calculation:', {
      daysUntilBooking: feeCalculation.daysUntilBooking,
      feeRate: feeCalculation.feeRate,
      feeAmount: feeCalculation.feeAmount,
      refundAmount: feeCalculation.refundAmount
    })

    // 8. Stripe 클라이언트 초기화
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-09-30.clover',
    })

    // 9. Payment Intent 상태 확인
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'requires_capture') {
      console.error('❌ [CANCEL] Invalid Payment Intent status:', paymentIntent.status)
      return {
        error: 'Cannot cancel - invalid payment status',
        status: paymentIntent.status
      }
    }

    // 10. Stripe 처리 (전액 환불 vs 부분 청구)
    let stripeResult: 'full_refund' | 'partial_capture' | 'full_capture'
    let capturedAmount = 0

    if (feeCalculation.feeRate === 0) {
      // 전액 환불: Payment Intent 완전 취소
      await stripe.paymentIntents.cancel(paymentIntentId)
      stripeResult = 'full_refund'
      console.log('✅ [CANCEL] Full refund - Payment Intent cancelled')
    } else if (feeCalculation.feeRate === 1.0) {
      // 100% 수수료: 전액 청구
      const captured = await stripe.paymentIntents.capture(paymentIntentId)
      capturedAmount = captured.amount
      stripeResult = 'full_capture'
      console.log('✅ [CANCEL] Full capture - 100% fee charged')
    } else {
      // 부분 청구: 수수료만 청구
      const captureAmountInCents = feeCalculation.feeAmount
      const captured = await stripe.paymentIntents.capture(paymentIntentId, {
        amount_to_capture: captureAmountInCents,
      })
      capturedAmount = captured.amount
      stripeResult = 'partial_capture'
      console.log('✅ [CANCEL] Partial capture:', {
        capturedAmount: captureAmountInCents,
        feeRate: feeCalculation.feeRate
      })
    }

    // 11. DB 업데이트 시작
    // 11-1. Booking 상태 업데이트
    const { error: bookingUpdateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: notes || reason || `고객 취소 (수수료 ${(feeCalculation.feeRate * 100).toFixed(0)}%)`,
      })
      .eq('id', bookingId)

    if (bookingUpdateError) {
      console.error('❌ [CANCEL] Booking update error:', bookingUpdateError)
    }

    // 11-2. Payment 상태 업데이트
    const paymentStatus = stripeResult === 'full_refund' ? 'cancelled' : 'paid'

    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        payment_status: paymentStatus,
        paid_at: stripeResult === 'full_refund' ? null : new Date().toISOString(),
        payment_metadata: {
          ...metadata,
          cancellationType: stripeResult,
          feeRate: feeCalculation.feeRate,
          feeAmount: feeCalculation.feeAmount,
          refundAmount: feeCalculation.refundAmount,
          capturedAmount,
          cancelledAt: new Date().toISOString(),
          cancelledBy: user.id,
        },
      })
      .eq('id', payment.id)

    if (paymentUpdateError) {
      console.error('❌ [CANCEL] Payment update error:', paymentUpdateError)
    }

    // 11-3. Payment event 로그
    await supabase.rpc('log_payment_event', {
      p_payment_id: payment.id,
      p_event_type: 'cancelled',
      p_metadata: {
        cancelledAt: new Date().toISOString(),
        cancelledBy: user.id,
        cancellationType: stripeResult,
        feeRate: feeCalculation.feeRate,
        feeAmount: feeCalculation.feeAmount,
        refundAmount: feeCalculation.refundAmount,
        capturedAmount,
        paymentIntentId,
      },
    })

    // 12. 트레이너에게 알림 전송
    if (booking.trainer_id) {
      const { data: trainer } = await supabase
        .from('trainers')
        .select('profile_id')
        .eq('id', booking.trainer_id)
        .single()

      if (trainer?.profile_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        const scheduledAt = new Date(bookingDateTime)
        const customerName = profile?.full_name || '고객'

        const notification = notificationTemplates.bookingCancelled(customerName, scheduledAt)

        await createNotification({
          userId: trainer.profile_id,
          ...notification,
          link: `/trainer/bookings/${bookingId}`,
        })
      }
    }

    // 13. 페이지 재검증
    revalidatePath(`/customer/bookings/${bookingId}`)
    revalidatePath('/customer/bookings')

    // 14. 성공 응답
    return {
      success: true,
      refundAmount: feeCalculation.refundAmount,
      feeAmount: feeCalculation.feeAmount,
      message: stripeResult === 'full_refund'
        ? '예약이 취소되었습니다. 전액 환불됩니다.'
        : `예약이 취소되었습니다. 취소 수수료 ${feeCalculation.feeAmount.toLocaleString()}원이 청구되고, ${feeCalculation.refundAmount.toLocaleString()}원이 환불됩니다.`
    }

  } catch (error: unknown) {
    console.error('💥 [CANCEL] Error:', error)

    // Stripe 에러 처리
    if (error instanceof Stripe.errors.StripeError) {
      return {
        error: 'Stripe error',
        message: error.message,
        type: error.type
      }
    }

    // 일반 에러
    return {
      error: error instanceof Error ? error.message : '예약 취소 중 오류가 발생했습니다.'
    }
  }
}
