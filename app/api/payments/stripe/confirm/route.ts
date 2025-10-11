import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { createNotification, notificationTemplates } from '@/lib/notifications';

/**
 * Stripe Payment Intent 승인 (카드 Hold)
 * POST /api/payments/stripe/confirm
 *
 * Payment Intent가 confirmed되어 카드 Hold 상태가 되면:
 * - payment_status: 'authorized' (아직 청구 안 됨!)
 * - booking_status: 'pending' (트레이너 승인 대기)
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
    const { paymentIntentId, bookingId } = await request.json();

    if (!paymentIntentId || !bookingId) {
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
        booking:bookings!inner(*)
      `)
      .eq('booking_id', bookingId)
      .eq('payment_provider', 'stripe')
      .single();

    if (paymentError || !payment) {
      console.error('Payment query error:', paymentError);
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // 4. Booking의 customer 조회 및 권한 확인
    const { data: bookingCustomer } = await supabase
      .from('customers')
      .select('profile_id')
      .eq('id', payment.booking.customer_id)
      .single();

    if (!bookingCustomer || bookingCustomer.profile_id !== user.id) {
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

    // 6. Payment Intent 조회
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // 7. Payment Intent 상태 확인 (requires_capture = 카드 Hold 성공)
    if (paymentIntent.status !== 'requires_capture') {
      console.error('❌ [STRIPE CONFIRM] Invalid status:', paymentIntent.status);
      return NextResponse.json(
        { error: 'Payment Intent status is not requires_capture', status: paymentIntent.status },
        { status: 400 }
      );
    }

    // 8. DB 업데이트 - 카드 Hold 성공 (청구는 아직 안 됨!)
    console.log('💳 [STRIPE CONFIRM] Card authorized (not charged yet):', {
      paymentId: payment.id,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount
    });

    // Prepare metadata with proper typing
    const existingMetadata = (payment.payment_metadata as Record<string, any>) || {};
    const updatedMetadata = {
      ...existingMetadata,
      stripePaymentIntentId: paymentIntent.id,
      paymentIntentStatus: paymentIntent.status,
      authorizedAt: new Date().toISOString(),
      amount: paymentIntent.amount,
    };

    const { error: updateError } = await supabase
      .from('payments')
      .update({
        payment_status: 'authorized', // 🔑 카드 Hold 상태 (청구 안 됨!)
        payment_method: paymentIntent.payment_method_types?.[0] || 'card',
        payment_metadata: updatedMetadata,
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('❌ [STRIPE CONFIRM] Payment update error:', updateError);
      return NextResponse.json(
        { error: 'Payment authorized but database update failed', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ [STRIPE CONFIRM] Payment authorized successfully');

    // 9. payment_events에 authorized 이벤트 기록
    await supabase.rpc('log_payment_event', {
      p_payment_id: payment.id,
      p_event_type: 'confirmed',
      p_metadata: {
        confirmedAt: new Date().toISOString(),
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        status: 'authorized',
        confirmedBy: user.id,
      },
    });

    // 10. Booking 상태 업데이트 - 트레이너 승인 대기
    console.log('📅 [STRIPE CONFIRM] Updating booking status to pending');

    await supabase
      .from('bookings')
      .update({
        status: 'pending', // 트레이너 승인 대기
      })
      .eq('id', payment.booking_id);

    // 11. 예약 타입에 따라 트레이너 알림 전송
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
      // 지정 예약: 트레이너에게 승인 요청 알림 전송
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

        console.log('✅ [STRIPE CONFIRM] Direct booking - Trainer notification sent');
      }
    } else if (booking.booking_type === 'recommended') {
      // 추천 예약: 자동 매칭 시작
      console.log('🚀 [STRIPE CONFIRM] Recommended booking - Starting auto-matching');

      try {
        const { notifySuitableTrainers } = await import('@/lib/auto-matching');
        const autoMatchResult = await notifySuitableTrainers(booking.id);

        if (autoMatchResult.error) {
          console.error('❌ [STRIPE CONFIRM] Auto-matching failed:', autoMatchResult.error);
        } else {
          console.log('✅ [STRIPE CONFIRM] Auto-matching successful');
        }
      } catch (autoMatchError) {
        console.error('💥 [STRIPE CONFIRM] Auto-matching exception:', autoMatchError);
      }
    }

    // 12. 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        status: 'authorized', // 카드 Hold 상태
        authorizedAt: new Date().toISOString(),
      },
    });

  } catch (error: unknown) {
    console.error('Stripe payment confirm error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
