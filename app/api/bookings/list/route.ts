import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Booking } from '@/lib/types';

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

    // 3. 각 예약의 결제 정보 및 트레이너 정보 조회
    const bookingsWithPayments = await Promise.all(
      (bookings || []).map(async (booking: Booking) => {
        // 결제 정보 조회
        const { data: payments } = await supabase
          .from('payments')
          .select('id, payment_status, amount')
          .eq('booking_id', booking.id);

        // 트레이너 정보 조회 (trainers + profiles join)
        const { data: trainerData } = await supabase
          .from('trainers')
          .select('id, profile_id, specialties, hourly_rate')
          .eq('id', booking.trainer_id)
          .single();

        let trainer = null;
        if (trainerData && trainerData.profile_id) {
          // profiles 테이블에서 이름 가져오기
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', trainerData.profile_id)
            .single();

          trainer = {
            id: trainerData.id,
            full_name: profileData?.full_name || '트레이너',
            specialties: trainerData.specialties,
            hourly_rate: trainerData.hourly_rate,
          };
        }

        return { ...booking, payments, trainer };
      })
    );

    // 4. 예약 분류
    const payableBookings = bookingsWithPayments.filter((booking) => {
      // 이미 결제된 예약 제외
      const hasPaidPayment = booking.payments?.some(
        (p: { payment_status: string }) => p.payment_status === 'paid'
      );

      // 결제 대기 중이거나 결제되지 않은 예약만
      return !hasPaidPayment && booking.status && ['pending', 'confirmed'].includes(booking.status);
    });

    const paidBookings = bookingsWithPayments.filter((booking) => {
      // 결제 완료된 예약
      const hasPaidPayment = booking.payments?.some(
        (p: { payment_status: string }) => p.payment_status === 'paid'
      );
      return hasPaidPayment;
    });

    const completedBookings = bookingsWithPayments.filter((booking: Booking) => {
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

  } catch (error: unknown) {
    console.error('Bookings list error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', message: errorMessage },
      { status: 500 }
    );
  }
}
