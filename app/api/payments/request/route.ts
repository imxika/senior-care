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
    const { bookingId, amount, orderName, customerName } = await request.json();

    if (!bookingId || !amount || !orderName || !customerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 3. Booking 존재 및 권한 확인
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers!inner(id, profile_id, full_name)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // 4. 권한 확인 (본인 예약만)
    if (booking.customer.profile_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - Not your booking' },
        { status: 403 }
      );
    }

    // 5. 이미 결제된 예약인지 확인
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .in('payment_status', ['paid', 'pending'])
      .maybeSingle();

    if (existingPayment) {
      return NextResponse.json(
        { error: 'Payment already exists for this booking' },
        { status: 400 }
      );
    }

    // 6. Toss Order ID 생성
    const tossOrderId = `order_${bookingId.substring(0, 8)}_${Date.now()}`;

    // 7. Payment 레코드 생성
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        customer_id: booking.customer.id,
        toss_order_id: tossOrderId,
        amount: amount,
        currency: 'KRW',
        payment_method: 'pending', // 결제 수단은 나중에 업데이트
        payment_status: 'pending',
        payment_metadata: {
          orderName,
          customerName,
          requestedAt: new Date().toISOString()
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

    // 8. 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        orderId: tossOrderId,
        amount: amount,
        orderName,
        customerName
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
