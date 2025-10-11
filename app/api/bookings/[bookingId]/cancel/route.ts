import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { calculateCancellationFee } from '@/lib/cancellation-fee'
import { createNotification, notificationTemplates } from '@/lib/notifications'

/**
 * 고객 예약 취소 (부분 청구)
 * POST /api/bookings/[bookingId]/cancel
 *
 * 취소 시점에 따라 수수료 차등 적용:
 * - 7일 이상 전: Payment Intent 완전 취소 (0% 수수료)
 * - 7일 이내: Partial Capture로 수수료만 청구
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const supabase = await createClient()
    const { bookingId } = params

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. 요청 body 파싱
    const body = await request.json()
    const { cancellationReason } = body

    // 3. 예약 조회 (customer 권한 확인 포함)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers!inner(profile_id)
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      console.error('❌ [CANCEL] Booking not found:', bookingError)
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // 4. 권한 확인 (본인의 예약인지)
    if (booking.customer.profile_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 5. 예약 상태 확인
    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Already cancelled' },
        { status: 400 }
      )
    }

    if (booking.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel completed booking' },
        { status: 400 }
      )
    }

    // 6. 결제 정보 조회
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('payment_provider', 'stripe')
      .single()

    if (paymentError || !payment) {
      console.error('❌ [CANCEL] Payment not found:', paymentError)
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // 7. Payment Intent ID 추출
    const metadata = payment.payment_metadata as Record<string, unknown>
    const paymentIntentId = metadata?.stripePaymentIntentId as string

    if (!paymentIntentId) {
      console.error('❌ [CANCEL] Payment Intent ID not found in metadata')
      return NextResponse.json(
        { error: 'Payment Intent ID not found' },
        { status: 400 }
      )
    }

    // 8. 취소 수수료 계산
    const bookingDateTime = `${booking.booking_date}T${booking.start_time}`
    const totalAmount = payment.amount

    const feeCalculation = calculateCancellationFee(bookingDateTime, totalAmount)

    if (!feeCalculation.canCancel) {
      return NextResponse.json(
        {
          error: 'Cannot cancel',
          reason: feeCalculation.cancellationReason
        },
        { status: 400 }
      )
    }

    console.log('💰 [CANCEL] Fee calculation:', {
      daysUntilBooking: feeCalculation.daysUntilBooking,
      feeRate: feeCalculation.feeRate,
      feeAmount: feeCalculation.feeAmount,
      refundAmount: feeCalculation.refundAmount
    })

    // 9. Stripe 클라이언트 초기화
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-09-30.clover',
    })

    // 10. Payment Intent 상태 확인
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'requires_capture') {
      console.error('❌ [CANCEL] Invalid Payment Intent status:', paymentIntent.status)
      return NextResponse.json(
        {
          error: 'Cannot cancel - invalid payment status',
          status: paymentIntent.status
        },
        { status: 400 }
      )
    }

    // 11. Stripe 처리 (전액 환불 vs 부분 청구)
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
      const captureAmountInCents = feeCalculation.feeAmount // KRW는 센트 변환 불필요
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

    // 12. DB 업데이트 시작
    // 12-1. Booking 상태 업데이트
    const { error: bookingUpdateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: cancellationReason || `고객 취소 (수수료 ${(feeCalculation.feeRate * 100).toFixed(0)}%)`,
      })
      .eq('id', bookingId)

    if (bookingUpdateError) {
      console.error('❌ [CANCEL] Booking update error:', bookingUpdateError)
      // Stripe 처리는 완료되었으므로 에러 반환하지 않고 계속 진행
    }

    // 12-2. Payment 상태 업데이트
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

    // 12-3. Payment event 로그
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

    // 13. 트레이너에게 알림 전송
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

    // 14. 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        bookingId,
        cancellationType: stripeResult,
        feeRate: feeCalculation.feeRate,
        feeAmount: feeCalculation.feeAmount,
        refundAmount: feeCalculation.refundAmount,
        capturedAmount,
        message: stripeResult === 'full_refund'
          ? '예약이 취소되었습니다. 전액 환불됩니다.'
          : `예약이 취소되었습니다. 취소 수수료 ${feeCalculation.feeAmount.toLocaleString()}원이 청구되고, ${feeCalculation.refundAmount.toLocaleString()}원이 환불됩니다.`
      },
    })

  } catch (error: unknown) {
    console.error('💥 [CANCEL] Error:', error)

    // Stripe 에러 처리
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        {
          error: 'Stripe error',
          message: error.message,
          type: error.type
        },
        { status: 400 }
      )
    }

    // 일반 에러
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
