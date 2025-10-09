import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 결제 요청 생성
 * POST /api/payments/request
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
    const { bookingId, amount, orderName, customerName, paymentProvider = 'toss' } = await request.json();

    if (!bookingId || !amount || !orderName || !customerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate payment provider
    if (paymentProvider !== 'toss' && paymentProvider !== 'stripe') {
      return NextResponse.json(
        { error: 'Invalid payment provider' },
        { status: 400 }
      );
    }

    // 3. Booking 존재 확인
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // 4. Customer 정보 조회 및 권한 확인
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, profile_id, full_name')
      .eq('id', booking.customer_id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // 5. 권한 확인 (본인 예약만)
    if (customer.profile_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - Not your booking' },
        { status: 403 }
      );
    }

    // 5. 기존 결제 확인 및 처리
    const { data: existingPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .in('payment_status', ['paid', 'pending']);

    // 5-1. 이미 완료된 결제가 있으면 에러
    const paidPayment = existingPayments?.find(p => p.payment_status === 'paid');
    if (paidPayment) {
      return NextResponse.json(
        { error: 'Payment already completed for this booking' },
        { status: 400 }
      );
    }

    // 5-2. pending 상태가 있으면 자동 취소 (재시도를 위해)
    const pendingPayment = existingPayments?.find(p => p.payment_status === 'pending');
    if (pendingPayment) {
      // payment_events에 자동 취소 이벤트 기록
      await supabase.rpc('log_payment_event', {
        p_payment_id: pendingPayment.id,
        p_event_type: 'cancelled',
        p_metadata: {
          cancelledAt: new Date().toISOString(),
          cancelReason: 'AUTO_CANCEL_FOR_RETRY',
          cancelledBy: user.id,
          note: '새 결제 요청으로 인한 자동 취소'
        }
      });

      // payment 상태를 cancelled로 업데이트
      await supabase
        .from('payments')
        .update({ payment_status: 'cancelled' })
        .eq('id', pendingPayment.id);
    }

    // 6. Order ID 생성 (Provider별)
    const orderId = `order_${bookingId.substring(0, 8)}_${Date.now()}`;

    // 7. Payment 레코드 생성
    const { data: payment, error: paymentError} = await supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        customer_id: customer.id,
        toss_order_id: orderId, // 범용 orderId로 사용
        amount: amount,
        currency: 'KRW',
        payment_method: 'pending', // 결제 수단은 나중에 업데이트
        payment_status: 'pending',
        payment_provider: paymentProvider, // 결제 제공자
        payment_metadata: {
          orderName,
          customerName,
          requestedAt: new Date().toISOString(),
          provider: paymentProvider
        }
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment insert error:', paymentError);
      return NextResponse.json(
        { error: 'Failed to create payment record', details: paymentError.message },
        { status: 500 }
      );
    }

    // 8. payment_events에 생성 이벤트 기록
    const { error: eventError } = await supabase.rpc('log_payment_event', {
      p_payment_id: payment.id,
      p_event_type: 'created',
      p_metadata: {
        createdAt: new Date().toISOString(),
        amount: amount,
        orderId: orderId,
        orderName,
        customerName,
        provider: paymentProvider,
        createdBy: user.id
      }
    });

    if (eventError) {
      console.error('Failed to log payment event:', eventError);
      // 이벤트 기록 실패는 에러로 처리하지 않음 (주요 기능은 성공)
    }

    // 9. 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        orderId: orderId,
        amount: amount,
        orderName,
        customerName,
        paymentProvider: paymentProvider
      }
    });

  } catch (error: any) {
    console.error('Payment request error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
