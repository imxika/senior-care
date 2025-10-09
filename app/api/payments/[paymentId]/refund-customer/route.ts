import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

/**
 * 고객 예약 취소 시 자동 환불 처리
 * POST /api/payments/[paymentId]/refund-customer
 *
 * 고객이 예약 취소 시 자동으로 호출됨
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params
    const body = await request.json()
    const { reason, customerId, bookingId, refundAmount } = body

    const supabase = await createClient()

    // 1. 고객 권한 확인 (서버 액션에서 호출되므로 인증 확인)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      .select('*')
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
      const paymentIntentId = payment.payment_metadata?.stripePaymentIntentId

      if (!paymentIntentId) {
        return NextResponse.json(
          { error: 'Stripe payment information not found' },
          { status: 400 }
        )
      }

      try {
        // 부분 환불 (취소 수수료 차감)
        const refundAmountInCents = Math.round(refundAmount * 100)

        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: refundAmountInCents, // 취소 수수료 차감된 금액
          reason: 'requested_by_customer',
          metadata: {
            refund_reason: reason,
            booking_id: bookingId,
            customer_id: customerId,
            refunded_at: new Date().toISOString()
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
      const paymentKey = payment.payment_metadata?.paymentKey

      if (!paymentKey) {
        return NextResponse.json(
          { error: 'Toss payment key not found' },
          { status: 400 }
        )
      }

      try {
        const tossResponse = await fetch(
          `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              cancelReason: reason,
              cancelAmount: Math.round(refundAmount) // 취소 수수료 차감된 금액
            })
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
          amount: tossData.cancels?.[0]?.cancelAmount || refundAmount,
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

    // 6. DB 업데이트 - 새로운 payment 레코드 생성 (cancelled 상태)
    const { error: insertError } = await serviceSupabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        amount: (-refundAmount).toString(), // 음수로 환불 표시
        currency: payment.currency,
        payment_method: payment.payment_method,
        payment_status: 'cancelled',
        payment_provider: payment.payment_provider,
        refunded_at: new Date().toISOString(),
        payment_metadata: {
          original_payment_id: paymentId,
          refund: {
            ...refundResult,
            reason,
            refundedAt: new Date().toISOString()
          }
        }
      })

    if (insertError) {
      console.error('DB insert failed:', insertError)
      return NextResponse.json(
        {
          error: 'Refund succeeded but DB update failed',
          refundResult
        },
        { status: 500 }
      )
    }

    console.log('Customer refund completed:', {
      paymentId,
      provider: payment.payment_provider,
      refundAmount,
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
