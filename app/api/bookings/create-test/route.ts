import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 테스트용 Booking 생성 (현재 로그인한 사용자의 customer로 생성)
 * POST /api/bookings/create-test
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in first.' },
        { status: 401 }
      );
    }

    // 2. 현재 사용자의 customer 찾기
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, full_name')
      .eq('profile_id', user.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'No customer profile found. Please create a customer profile first (customers 테이블에 profile_id 매칭 필요).' },
        { status: 404 }
      );
    }

    // 3. 첫 번째 trainer 찾기 (또는 생성)
    let trainerId: string;
    const { data: existingTrainer } = await supabase
      .from('trainers')
      .select('id')
      .limit(1)
      .single();

    if (existingTrainer) {
      trainerId = existingTrainer.id;
    } else {
      // Trainer가 없으면 테스트 트레이너 생성
      const { data: newTrainer, error: trainerError } = await supabase
        .from('trainers')
        .insert({
          full_name: '테스트 트레이너',
          phone: '010-9876-5432',
          hourly_rate: 100000,
          specialization: 'general',
        })
        .select('id')
        .single();

      if (trainerError || !newTrainer) {
        return NextResponse.json(
          { error: 'Failed to create trainer', details: trainerError?.message },
          { status: 500 }
        );
      }
      trainerId = newTrainer.id;
    }

    // 4. 테스트 Booking 생성 (7일 후 예약)
    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 7);

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: customer.id,
        trainer_id: trainerId,
        booking_date: bookingDate.toISOString().split('T')[0],
        start_time: '10:00:00',
        end_time: '11:00:00',
        duration_minutes: 60,
        total_price: 100000,
        status: 'pending',
      })
      .select('*')
      .single();

    if (bookingError) {
      console.error('Booking creation error:', bookingError);
      return NextResponse.json(
        { error: 'Failed to create booking', details: bookingError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test booking created successfully',
      data: {
        booking,
        customer: customer.full_name,
        bookingDate: bookingDate.toISOString().split('T')[0],
      },
    });

  } catch (error: any) {
    console.error('Create test booking error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
