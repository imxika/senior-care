import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { createNotification, notificationTemplates } from '@/lib/notifications'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

/**
 * 결제 환불 처리
 * POST /api/payments/[paymentId]/refund
 *
 * Admin만 호출 가능
 * Toss Payments와 Stripe 모두 지원
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params
    const body = await request.json()
    const { reason, refundAmount, cancellationInfo } = body // 환불 사유, 환불 금액, 취소 정보

    const supabase = await createClient()

    // 1. Admin 권한 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    // 2. Service Role client
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

    // 3. Payment 조회
    const { data: payment, error: paymentError } = await serviceSupabase
      .from('payments')
      .select(`
        *,
        booking:bookings!booking_id(
          id,
          booking_date,
          start_time,
          customer:customers!customer_id(
            id,
            profile:profiles!profile_id(id, full_name, email)
          ),
          trainer:trainers!trainer_id(
            id,
            profile:profiles!profile_id(id, full_name)
          )
        )
      `)
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // 4. 환불 가능 상태 확인
    if (payment.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Only paid payments can be refunded' },
        { status: 400 }
      )
    }

    if (payment.payment_status === 'refunded') {
      return NextResponse.json(
        { error: 'Payment already refunded' },
        { status: 400 }
      )
    }

    let refundResult: any = null

    // 5. 결제 수단별 환불 처리
    if (payment.payment_provider === 'stripe') {
      // Stripe 환불
      const sessionId = payment.payment_metadata?.stripeSessionId
      const paymentIntentId = payment.payment_metadata?.stripePaymentIntentId

      if (!paymentIntentId && !sessionId) {
        return NextResponse.json(
          { error: 'Stripe payment information not found' },
          { status: 400 }
        )
      }

      try {
        // 환불 금액 계산 (부분 환불 지원)
        const amountToRefund = refundAmount ? Math.round(refundAmount * 100) : undefined // cents 단위

        // PaymentIntent로 환불
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: amountToRefund, // undefined면 전액 환불
          reason: 'requested_by_customer',
          metadata: {
            refund_reason: reason || 'Admin refund',
            refunded_by: user.id,
            refunded_at: new Date().toISOString(),
            ...(cancellationInfo && {
              cancellation_fee: cancellationInfo.feeAmount,
              cancellation_fee_rate: cancellationInfo.feeRate,
              time_category: cancellationInfo.timeCategory
            })
          }
        })

        refundResult = {
          refundId: refund.id,
          amount: refund.amount / 100, // 원 단위로 변환
          status: refund.status,
          provider: 'stripe'
        }

      } catch (stripeError: any) {
        console.error('Stripe refund failed:', stripeError)
        return NextResponse.json(
          { error: `Stripe refund failed: ${stripeError.message}` },
          { status: 500 }
        )
      }

    } else if (payment.payment_provider === 'toss') {
      // Toss Payments 환불
      const paymentKey = payment.payment_metadata?.paymentKey

      if (!paymentKey) {
        return NextResponse.json(
          { error: 'Toss payment key not found' },
          { status: 400 }
        )
      }

      try {
        // 부분 환불 지원
        const cancelBody: any = {
          cancelReason: reason || 'Admin refund'
        }

        // 부분 환불인 경우 금액 지정
        if (refundAmount) {
          cancelBody.cancelAmount = Math.round(refundAmount)
        }

        const tossResponse = await fetch(
          `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(cancelBody)
          }
        )

        if (!tossResponse.ok) {
          const errorData = await tossResponse.json()
          console.error('Toss refund failed:', errorData)
          return NextResponse.json(
            { error: `Toss refund failed: ${errorData.message}` },
            { status: 500 }
          )
        }

        const tossData = await tossResponse.json()
        refundResult = {
          refundId: tossData.transactionKey,
          amount: refundAmount || parseFloat(payment.amount), // 부분 환불 또는 전액
          status: tossData.status,
          provider: 'toss'
        }

      } catch (tossError: any) {
        console.error('Toss refund failed:', tossError)
        return NextResponse.json(
          { error: `Toss refund failed: ${tossError.message}` },
          { status: 500 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported payment provider' },
        { status: 400 }
      )
    }

    // 6. DB 업데이트
    const { error: updateError } = await serviceSupabase
      .from('payments')
      .update({
        payment_status: 'refunded',
        refunded_at: new Date().toISOString(),
        payment_metadata: {
          ...payment.payment_metadata,
          refund: {
            ...refundResult,
            reason,
            refundedBy: user.id,
            refundedAt: new Date().toISOString(),
            ...(cancellationInfo && {
              cancellationFee: cancellationInfo.feeAmount,
              cancellationFeeRate: cancellationInfo.feeRate,
              timeCategory: cancellationInfo.timeCategory
            })
          }
        }
      })
      .eq('id', paymentId)

    if (updateError) {
      console.error('DB update failed:', updateError)
      // 환불은 성공했지만 DB 업데이트 실패 - 중요한 에러
      return NextResponse.json(
        {
          error: 'Refund succeeded but DB update failed',
          refundResult
        },
        { status: 500 }
      )
    }

    // 7. 고객과 트레이너에게 알림 전송
    const booking = Array.isArray(payment.booking) ? payment.booking[0] : payment.booking

    if (booking) {
      const customer = booking.customer
      const trainer = booking.trainer
      const customerProfile = Array.isArray(customer?.profile) ? customer.profile[0] : customer?.profile
      const trainerProfile = Array.isArray(trainer?.profile) ? trainer.profile[0] : trainer?.profile

      // 고객에게 알림
      if (customerProfile?.id) {
        await createNotification({
          userId: customerProfile.id,
          title: '결제가 환불되었습니다',
          message: `${parseFloat(payment.amount).toLocaleString()}원이 환불 처리되었습니다. ${reason ? `사유: ${reason}` : ''}`,
          type: 'system',
          link: `/customer/bookings/${booking.id}`
        })
      }

      // 트레이너에게 알림
      if (trainerProfile?.id) {
        await createNotification({
          userId: trainerProfile.id,
          title: '예약이 환불되었습니다',
          message: `예약 결제가 환불 처리되었습니다. ${reason ? `사유: ${reason}` : ''}`,
          type: 'system',
          link: `/trainer/bookings/${booking.id}`
        })
      }
    }

    console.log('Refund completed:', {
      paymentId,
      provider: payment.payment_provider,
      amount: payment.amount,
      refundResult
    })

    return NextResponse.json({
      success: true,
      refund: refundResult,
      message: 'Refund completed successfully'
    })

  } catch (error) {
    console.error('Refund error:', error)
    return NextResponse.json(
      { error: 'Refund processing failed' },
      { status: 500 }
    )
  }
}
