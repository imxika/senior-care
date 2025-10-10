import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { createNotification, notificationTemplates } from '@/lib/notifications';

/**
 * Stripe 결제 승인
 * POST /api/payments/stripe/confirm
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
    const { sessionId, orderId, amount } = await request.json();

    if (!sessionId || !orderId || !amount) {
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
        customer:customers!inner(profile_id)
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

    // 5. 금액 일치 확인
    if (parseFloat(payment.amount) !== amount) {
      return NextResponse.json(
        { error: 'Amount mismatch' },
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

    // 7. Stripe Checkout Session 조회
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // 8. Session 상태 확인
    if (session.payment_status !== 'paid') {
      // DB 업데이트 - 실패 기록
      await supabase
        .from('payments')
        .update({
          payment_status: 'failed',
          failed_at: new Date().toISOString(),
          failure_code: 'PAYMENT_NOT_COMPLETED',
          failure_message: `Payment status: ${session.payment_status}`,
        })
        .eq('id', payment.id);

      return NextResponse.json(
        { error: 'Payment not completed', status: session.payment_status },
        { status: 400 }
      );
    }

    // 9. PaymentIntent 조회 (추가 정보 확인용)
    let paymentIntent = null;
    let latestCharge = null;
    if (session.payment_intent && typeof session.payment_intent === 'string') {
      paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);

      // latest_charge로 charge 정보 가져오기
      if (paymentIntent.latest_charge && typeof paymentIntent.latest_charge === 'string') {
        latestCharge = await stripe.charges.retrieve(paymentIntent.latest_charge);
      }
    }

    // 10. DB 업데이트 - 결제 성공
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        toss_payment_key: session.id, // Stripe Session ID를 저장
        payment_status: 'paid',
        payment_method: paymentIntent?.payment_method_types?.[0] || 'card',
        paid_at: new Date(session.created * 1000).toISOString(),
        card_company: latestCharge?.payment_method_details?.card?.brand || null,
        card_number_masked: latestCharge?.payment_method_details?.card?.last4
          ? `****-****-****-${latestCharge.payment_method_details.card.last4}`
          : null,
        payment_metadata: {
          ...payment.payment_metadata,
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent,
          stripeCustomerId: session.customer,
          stripeResponse: {
            id: session.id,
            amount_total: session.amount_total,
            currency: session.currency,
            payment_status: session.payment_status,
            customer_email: session.customer_email,
          },
        },
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Payment update error:', updateError);
      return NextResponse.json(
        { error: 'Payment completed but database update failed' },
        { status: 500 }
      );
    }

    // 11. payment_events에 confirmed 이벤트 기록
    await supabase.rpc('log_payment_event', {
      p_payment_id: payment.id,
      p_event_type: 'confirmed',
      p_metadata: {
        confirmedAt: new Date().toISOString(),
        stripeSessionId: session.id,
        amount: session.amount_total,
        method: paymentIntent?.payment_method_types?.[0] || 'card',
        confirmedBy: user.id,
      },
    });

    // 12. Booking 상태 업데이트 - 결제 완료 → 트레이너 승인 대기
    await supabase
      .from('bookings')
      .update({
        status: 'pending', // 🆕 결제 완료 후 트레이너 승인 대기 상태로 변경
      })
      .eq('id', payment.booking_id);

    // 13. 예약 타입에 따라 후속 처리
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, booking_type, booking_date, start_time, trainer_id')
      .eq('id', payment.booking_id)
      .single();

    if (!booking) {
      console.error('Booking not found after payment');
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // 고객 이름 조회 (알림용)
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (booking.booking_type === 'direct' && booking.trainer_id) {
      // 🆕 지정 예약: 트레이너에게 승인 요청 알림 전송
      const { data: trainer } = await supabase
        .from('trainers')
        .select('id, profile_id')
        .eq('id', booking.trainer_id)
        .single();

      if (trainer?.profile_id) {
        const scheduledAt = new Date(`${booking.booking_date}T${booking.start_time}`);
        const customerName = profile?.full_name || '고객';

        const notification = notificationTemplates.bookingPending(customerName, scheduledAt);

        await createNotification({
          userId: trainer.profile_id,
          ...notification,
          link: `/trainer/bookings/${payment.booking_id}`,
        });

        console.log('✅ [PAYMENT] Direct booking - Trainer notification sent');
      }
    } else if (booking.booking_type === 'recommended') {
      // 🆕 추천 예약: 자동 매칭 시작
      console.log('🚀 [PAYMENT] Recommended booking - Starting auto-matching');

      // 자동 매칭 함수 호출 (동적 import로 순환 참조 방지)
      const { notifySuitableTrainers } = await import('@/lib/auto-matching');
      const autoMatchResult = await notifySuitableTrainers(booking.id);

      if (autoMatchResult.error) {
        console.error('❌ [PAYMENT] Auto-matching failed:', autoMatchResult.error);
        // 자동 매칭 실패해도 결제는 성공 처리 - Admin이 수동 매칭 가능
      } else {
        console.log('✅ [PAYMENT] Auto-matching successful:', autoMatchResult);
      }
    }

    // 14. 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        paymentKey: session.id,
        orderId: orderId,
        amount: session.amount_total,
        status: session.payment_status,
        approvedAt: new Date(session.created * 1000).toISOString(),
        method: paymentIntent?.payment_method_types?.[0] || 'card',
      },
    });

  } catch (error: any) {
    console.error('Stripe payment confirm error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
