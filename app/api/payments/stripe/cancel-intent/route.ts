import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

/**
 * Stripe Payment Intent Cancel (트레이너 거절 또는 타임아웃)
 * POST /api/payments/stripe/cancel-intent
 *
 * 트레이너가 예약을 거절하거나 24시간 타임아웃 시:
 * - Hold된 카드 해제
 * - 환불 불필요 (실제 청구 안 됐으므로)
 * - payment_status: 'intent_created' → 'cancelled'
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
    const { paymentId, reason } = await request.json();

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

    // 5. 이미 취소된 경우 체크
    if (payment.payment_status === 'cancelled') {
      return NextResponse.json(
        { success: true, message: 'Payment already cancelled' },
        { status: 200 }
      );
    }

    // 6. 이미 capture된 경우 에러
    if (payment.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot cancel captured payment. Use refund instead.' },
        { status: 400 }
      );
    }

    // 7. Stripe 클라이언트 초기화
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-09-30.clover',
    });

    // 8. Payment Intent Cancel 실행
    const cancelledIntent = await stripe.paymentIntents.cancel(paymentIntentId, {
      cancellation_reason: reason || 'requested_by_customer',
    });

    // 9. DB 업데이트
    await supabase
      .from('payments')
      .update({
        payment_status: 'cancelled',
        payment_metadata: {
          ...payment.payment_metadata,
          cancelledAt: new Date().toISOString(),
          cancellationReason: reason || 'trainer_rejected',
        },
      })
      .eq('id', payment.id);

    // 10. payment_events에 cancelled 이벤트 기록
    await supabase.rpc('log_payment_event', {
      p_payment_id: payment.id,
      p_event_type: 'cancelled',
      p_metadata: {
        cancelledAt: new Date().toISOString(),
        stripePaymentIntentId: paymentIntentId,
        cancellationReason: reason || 'trainer_rejected',
        cancelledBy: user.id,
      },
    });

    // 11. 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        paymentIntentId: cancelledIntent.id,
        status: cancelledIntent.status,
        cancellationReason: cancelledIntent.cancellation_reason,
      },
    });

  } catch (error: unknown) {
    console.error('Stripe Payment Intent cancel error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
