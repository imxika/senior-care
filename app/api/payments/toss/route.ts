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
          failure_message: error.message,
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

    // 10. Booking 상태 업데이트 - 결제 완료 → 예약 확정
    await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', payment.booking_id);

    // 11. 트레이너에게 알림 전송 (결제 완료 후)
    // Booking 정보와 트레이너 정보 조회
    const { data: bookingWithTrainer } = await supabase
      .from('bookings')
      .select(`
        booking_date,
        start_time,
        trainer:trainers!inner(
          id,
          profile_id
        )
      `)
      .eq('id', payment.booking_id)
      .single();

    // 고객 이름 조회
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // 알림 생성 및 전송
    if (bookingWithTrainer?.trainer) {
      const trainerData = Array.isArray(bookingWithTrainer.trainer)
        ? bookingWithTrainer.trainer[0]
        : bookingWithTrainer.trainer;

      if (trainerData?.profile_id) {
        const scheduledAt = new Date(
          `${bookingWithTrainer.booking_date}T${bookingWithTrainer.start_time}`
        );
        const customerName = profile?.full_name || '고객';

        const notification = notificationTemplates.bookingPending(customerName, scheduledAt);

        await createNotification({
          userId: trainerData.profile_id,
          ...notification,
          link: `/trainer/bookings/${payment.booking_id}`,
        });
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

  } catch (error: any) {
    console.error('Payment confirm error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
