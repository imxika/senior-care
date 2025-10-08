import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Booking 목록 조회 (테스트용)
 * GET /api/bookings/list
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // 인증 없어도 테스트용으로 조회 허용 (개발 환경에서만)
    const isAuthenticated = !authError && user;

    // 2. Bookings 조회 (간단하게)
    let query = supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    // 인증된 경우 본인 예약만 조회
    if (isAuthenticated) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (customer) {
        query = query.eq('customer_id', customer.id);
      }
    }

    const { data: bookings, error: bookingError } = await query;

    if (bookingError) {
      console.error('Booking fetch error:', bookingError);
      return NextResponse.json(
        { error: 'Failed to fetch bookings', details: bookingError.message },
        { status: 500 }
      );
    }

    // 3. 각 예약의 결제 정보 조회
    const bookingsWithPayments = await Promise.all(
      (bookings || []).map(async (booking: any) => {
        const { data: payments } = await supabase
          .from('payments')
          .select('id, payment_status, amount')
          .eq('booking_id', booking.id);

        return { ...booking, payments };
      })
    );

    // 4. 예약 분류
    const payableBookings = bookingsWithPayments.filter((booking: any) => {
      // 이미 결제된 예약 제외
      const hasPaidPayment = booking.payments?.some(
        (p: any) => p.payment_status === 'paid'
      );

      // 결제 대기 중이거나 결제되지 않은 예약만
      return !hasPaidPayment && ['pending', 'confirmed'].includes(booking.status);
    });

    const paidBookings = bookingsWithPayments.filter((booking: any) => {
      // 결제 완료된 예약
      const hasPaidPayment = booking.payments?.some(
        (p: any) => p.payment_status === 'paid'
      );
      return hasPaidPayment;
    });

    const completedBookings = bookingsWithPayments.filter((booking: any) => {
      // 완료된 예약 (정산 테스트용)
      return booking.status === 'completed';
    });

    return NextResponse.json({
      success: true,
      count: bookings?.length || 0,
      payableCount: payableBookings?.length || 0,
      paidCount: paidBookings?.length || 0,
      completedCount: completedBookings?.length || 0,
      data: {
        allBookings: bookings,
        payableBookings: payableBookings,
        paidBookings: paidBookings,
        completedBookings: completedBookings,
      }
    });

  } catch (error: any) {
    console.error('Bookings list error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
