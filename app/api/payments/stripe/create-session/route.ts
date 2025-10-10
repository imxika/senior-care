import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

/**
 * Stripe Checkout Session 생성
 * POST /api/payments/stripe/create-session
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. 요청 데이터 파싱
    const { orderId, amount, successUrl, cancelUrl } = await request.json();

    if (!orderId || !amount || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 3. DB에서 Payment 조회
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        booking:bookings!inner(*),
        customer:customers!inner(profile_id, full_name)
      `)
      .eq('toss_order_id', orderId)
      .eq('payment_provider', 'stripe')
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // 4. 권한 확인
    if (payment.customer.profile_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 5. Stripe 클라이언트 초기화
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-09-30.clover',
    });

    // 6. Stripe Checkout Session 생성
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'krw',
            product_data: {
              name: payment.payment_metadata?.orderName || '시니어케어 트레이닝 세션',
              description: `Booking ID: ${payment.booking_id}`,
            },
            unit_amount: parseInt(payment.amount),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}&amount=${amount}`,
      cancel_url: cancelUrl,
      customer_email: user.email,
      metadata: {
        orderId: orderId,
        paymentId: payment.id,
        bookingId: payment.booking_id,
        customerId: payment.customer_id,
      },
    });

    // 7. Payment 메타데이터에 Stripe Session ID 저장
    await supabase
      .from('payments')
      .update({
        payment_metadata: {
          ...payment.payment_metadata,
          stripeSessionId: session.id,
          stripeSessionUrl: session.url,
        },
      })
      .eq('id', payment.id);

    // 8. payment_events에 session_created 이벤트 기록
    await supabase.rpc('log_payment_event', {
      p_payment_id: payment.id,
      p_event_type: 'created',
      p_metadata: {
        createdAt: new Date().toISOString(),
        stripeSessionId: session.id,
        amount: amount,
        orderId: orderId,
        createdBy: user.id,
      },
    });

    // 9. 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        sessionUrl: session.url,
      },
    });

  } catch (error: unknown) {
    console.error('Stripe session creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
