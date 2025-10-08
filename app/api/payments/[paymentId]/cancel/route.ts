import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 결제 취소
 * POST /api/payments/[paymentId]/cancel
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
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
    const { cancelReason } = await request.json();

    // 3. Payment 조회
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        booking:bookings!inner(*),
        customer:customers!inner(profile_id)
      `)
      .eq('id', params.paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // 4. 권한 확인 (본인 or Admin)
    const isOwner = payment.customer.profile_id === user.id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();
    const isAdmin = profile?.user_type === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 5. 취소 가능 상태 확인
    if (payment.payment_status !== 'paid') {
      return NextResponse.json(
        { error: `Payment is not in paid status (current: ${payment.payment_status})` },
        { status: 400 }
      );
    }

    if (!payment.toss_payment_key) {
      return NextResponse.json(
        { error: 'Payment key not found' },
        { status: 400 }
      );
    }

    // 6. Toss Payments API 호출 - 결제 취소
    const tossSecretKey = process.env.TOSS_SECRET_KEY;
    if (!tossSecretKey) {
      throw new Error('TOSS_SECRET_KEY is not defined');
    }

    const tossResponse = await fetch(
      `https://api.tosspayments.com/v1/payments/${payment.toss_payment_key}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(tossSecretKey + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancelReason: cancelReason || '고객 요청',
        }),
      }
    );

    const tossData = await tossResponse.json();

    if (!tossResponse.ok) {
      return NextResponse.json(
        { error: tossData.message, code: tossData.code },
        { status: tossResponse.status }
      );
    }

    // 7. DB 업데이트 - 취소 완료
    await supabase
      .from('payments')
      .update({
        payment_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        refund_reason: cancelReason,
        refund_amount: payment.amount,
        refunded_at: new Date().toISOString(),
        payment_metadata: {
          ...payment.payment_metadata,
          cancelResponse: tossData,
        },
      })
      .eq('id', payment.id);

    // 8. Booking 상태 업데이트
    await supabase
      .from('bookings')
      .update({
        status: 'cancelled_by_customer',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', payment.booking_id);

    // 9. 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        cancelledAt: new Date().toISOString(),
        refundAmount: payment.amount,
        cancelReason: cancelReason || '고객 요청',
      }
    });

  } catch (error: any) {
    console.error('Payment cancel error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
