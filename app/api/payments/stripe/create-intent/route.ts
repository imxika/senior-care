import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

/**
 * Stripe Payment Intent 생성 (Manual Capture)
 * POST /api/payments/stripe/create-intent
 *
 * 3단계 결제 시스템:
 * 1. 예약 시: Payment Intent 생성 + 카드 홀드 (돈 안빠짐)
 * 2. 트레이너 승인: 홀드 유지 (여전히 돈 안빠짐)
 * 3. 서비스 완료: Capture 실행 (실제 청구)
 *
 * 취소 시: Partial Capture (수수료만 청구) 또는 Cancel (홀드 해제)
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
    const { orderId, amount } = await request.json();

    if (!orderId || !amount) {
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
        booking:bookings!inner(
          id,
          booking_date,
          start_time,
          duration,
          session_type,
          service_type
        ),
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

    // 6. Payment Intent 생성 (Manual Capture)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: parseInt(payment.amount),
      currency: 'krw',
      capture_method: 'manual', // 핵심! 수동 청구
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: orderId,
        paymentId: payment.id,
        bookingId: payment.booking_id,
        customerId: payment.customer_id,
        bookingDate: payment.booking.booking_date,
        startTime: payment.booking.start_time,
      },
      description: `시니어케어 ${payment.booking.session_type} ${payment.booking.service_type === 'home' ? '방문' : '센터'} 세션`,
    });

    // 7. Payment 메타데이터에 Payment Intent ID 저장
    await supabase
      .from('payments')
      .update({
        payment_metadata: {
          ...payment.payment_metadata,
          stripePaymentIntentId: paymentIntent.id,
          stripeClientSecret: paymentIntent.client_secret,
          captureMethod: 'manual',
          paymentStatus: 'intent_created', // 의도 생성됨
        },
      })
      .eq('id', payment.id);

    // 8. payment_events에 intent_created 이벤트 기록
    await supabase.rpc('log_payment_event', {
      p_payment_id: payment.id,
      p_event_type: 'created',
      p_metadata: {
        createdAt: new Date().toISOString(),
        stripePaymentIntentId: paymentIntent.id,
        amount: amount,
        orderId: orderId,
        captureMethod: 'manual',
        createdBy: user.id,
      },
    });

    // 9. 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
    });

  } catch (error: unknown) {
    console.error('Stripe Payment Intent creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
