import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TossPaymentConfirm, TossPaymentResponse, TossPaymentError } from '@/lib/types/toss';
import { createNotification, notificationTemplates } from '@/lib/notifications';

/**
 * Toss Payments 결제 승인
 * POST /api/payments/toss/confirm
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
    const { paymentKey, orderId, amount }: TossPaymentConfirm = await request.json();

    if (!paymentKey || !orderId || !amount) {
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

    // 6. Toss Payments API 호출 - 결제 승인
    const tossSecretKey = process.env.TOSS_SECRET_KEY;
    if (!tossSecretKey) {
      throw new Error('TOSS_SECRET_KEY is not defined');
    }

    const tossResponse = await fetch(
      'https://api.tosspayments.com/v1/payments/confirm',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(tossSecretKey + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount,
        }),
      }
    );

    const tossData: TossPaymentResponse | TossPaymentError = await tossResponse.json();

    // 7. Toss API 에러 처리
    if (!tossResponse.ok) {
      const error = tossData as TossPaymentError;

      // DB 업데이트 - 실패 기록
      await supabase
        .from('payments')
        .update({
          payment_status: 'failed',
          failed_at: new Date().toISOString(),
          failure_code: error.code,
          failure_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', payment.id);

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: tossResponse.status }
      );
    }

    const tossPayment = tossData as TossPaymentResponse;

    // 8. DB 업데이트 - 결제 성공
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        toss_payment_key: tossPayment.paymentKey,
        payment_status: 'paid',
        payment_method: tossPayment.method,
        paid_at: tossPayment.approvedAt,
        card_company: tossPayment.card?.issuerCode || null,
        card_number_masked: tossPayment.card?.number || null,
        payment_metadata: {
          ...payment.payment_metadata,
          tossResponse: tossPayment,
        },
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Payment update error:', updateError);
      // Toss에서는 승인됐지만 DB 업데이트 실패 - 중요한 에러
      // 관리자에게 알림 필요
      return NextResponse.json(
        { error: 'Payment approved but database update failed' },
        { status: 500 }
      );
    }

    // 9. payment_events에 confirmed 이벤트 기록
    await supabase.rpc('log_payment_event', {
      p_payment_id: payment.id,
      p_event_type: 'confirmed',
      p_metadata: {
        confirmedAt: tossPayment.approvedAt,
        paymentKey: tossPayment.paymentKey,
        amount: tossPayment.totalAmount,
        method: tossPayment.method,
        confirmedBy: user.id
      }
    });

    // 10. Booking 상태 업데이트 - 결제 완료 → 트레이너 승인 대기
    await supabase
      .from('bookings')
      .update({
        status: 'pending', // 🆕 결제 완료 후 트레이너 승인 대기 상태로 변경
      })
      .eq('id', payment.booking_id);

    // 11. 예약 타입에 따라 후속 처리
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

    // 12. 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        paymentKey: tossPayment.paymentKey,
        orderId: tossPayment.orderId,
        amount: tossPayment.totalAmount,
        status: tossPayment.status,
        approvedAt: tossPayment.approvedAt,
        method: tossPayment.method,
        receipt: tossPayment.receipt,
      }
    });

  } catch (error: unknown) {
    console.error('Payment confirm error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
