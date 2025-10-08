import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 테스트용 Booking 생성
 * POST /api/bookings/create-test
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // 1. 첫 번째 customer 찾기
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id, full_name')
      .limit(1)
      .single();

    if (customerError || !customers) {
      return NextResponse.json(
        { error: 'No customers found. Please create a customer first.' },
        { status: 404 }
      );
    }

    // 2. 첫 번째 trainer 찾기
    const { data: trainers, error: trainerError } = await supabase
      .from('trainers')
      .select('id, full_name')
      .limit(1)
      .single();

    if (trainerError || !trainers) {
      return NextResponse.json(
        { error: 'No trainers found. Please create a trainer first.' },
        { status: 404 }
      );
    }

    // 3. 테스트 Booking 생성
    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 7); // 7일 후

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: customers.id,
        trainer_id: trainers.id,
        booking_date: bookingDate.toISOString().split('T')[0],
        start_time: '10:00:00',
        end_time: '11:00:00',
        duration_minutes: 60,
        total_price: 100000,
        status: 'pending',
      })
      .select(`
        *,
        customer:customers(id, full_name),
        trainer:trainers(id, full_name)
      `)
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
      data: booking,
    });

  } catch (error: any) {
    console.error('Create test booking error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
