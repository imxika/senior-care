import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

/**
 * Stripe Payment Intent Capture (트레이너 승인 시 실제 청구)
 * POST /api/payments/stripe/capture
 *
 * 트레이너가 예약을 승인하면:
 * - Hold된 카드에서 실제로 돈을 청구함
 * - payment_status: 'intent_created' → 'paid'
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
    const { paymentId } = await request.json();

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Missing paymentId' },
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
          session_type,
          service_type,
          trainer_id
        )
      `)
      .eq('id', paymentId)
      .eq('payment_provider', 'stripe')
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // 4. Payment Intent ID 확인
    const paymentIntentId = payment.payment_metadata?.stripePaymentIntentId;
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment Intent not found' },
        { status: 400 }
      );
    }

    // 5. 이미 capture된 경우 체크
    if (payment.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Payment already captured' },
        { status: 400 }
      );
    }

    // 6. Stripe 클라이언트 초기화
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-09-30.clover',
    });

    // 7. Payment Intent Capture 실행
    const capturedIntent = await stripe.paymentIntents.capture(paymentIntentId);

    // 8. DB 업데이트
    await supabase
      .from('payments')
      .update({
        payment_status: 'paid',
        confirmed_at: new Date().toISOString(),
        payment_metadata: {
          ...payment.payment_metadata,
          capturedAt: new Date().toISOString(),
          capturedAmount: capturedIntent.amount_received,
          stripeChargeId: capturedIntent.latest_charge,
        },
      })
      .eq('id', payment.id);

    // 9. payment_events에 captured 이벤트 기록
    await supabase.rpc('log_payment_event', {
      p_payment_id: payment.id,
      p_event_type: 'confirmed',
      p_metadata: {
        capturedAt: new Date().toISOString(),
        stripePaymentIntentId: paymentIntentId,
        capturedAmount: capturedIntent.amount_received,
        stripeChargeId: capturedIntent.latest_charge,
        capturedBy: user.id,
      },
    });

    // 10. 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        paymentIntentId: capturedIntent.id,
        amount: capturedIntent.amount_received,
        status: capturedIntent.status,
      },
    });

  } catch (error: unknown) {
    console.error('Stripe Payment Intent capture error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
