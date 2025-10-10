import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/payments/cancel
 * 결제 취소 시 payment 상태를 'cancelled'로 업데이트
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. 해당 booking의 pending 상태 payment 찾기
    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select('id, customer_id, payment_metadata')
      .eq('booking_id', bookingId)
      .eq('payment_status', 'pending')
      .single();

    if (findError || !payment) {
      // pending 상태 payment가 없으면 그냥 성공 처리 (이미 취소됐거나 없음)
      return NextResponse.json({
        success: true,
        message: 'No pending payment to cancel'
      });
    }

    // 3. Customer 권한 확인
    const { data: customer } = await supabase
      .from('customers')
      .select('profile_id')
      .eq('id', payment.customer_id)
      .single();

    if (customer?.profile_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - Not your payment' },
        { status: 403 }
      );
    }

    // 4. payment_status를 'cancelled'로 업데이트
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        payment_status: 'cancelled',
        payment_metadata: {
          ...payment.payment_metadata,
          cancelledAt: new Date().toISOString(),
          cancelReason: 'USER_CANCEL'
        }
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Failed to update payment status:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel payment' },
        { status: 500 }
      );
    }

    // 5. payment_events에 취소 이벤트 기록
    const { error: eventError } = await supabase.rpc('log_payment_event', {
      p_payment_id: payment.id,
      p_event_type: 'cancelled',
      p_metadata: {
        cancelledAt: new Date().toISOString(),
        cancelReason: 'USER_CANCEL',
        cancelledBy: user.id
      }
    });

    if (eventError) {
      console.error('Failed to log payment event:', eventError);
      // 이벤트 기록 실패는 에러로 처리하지 않음 (주요 기능은 성공)
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        status: 'cancelled'
      }
    });

  } catch (error: unknown) {
    console.error('Payment cancel error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
