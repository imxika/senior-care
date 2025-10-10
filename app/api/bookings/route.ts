import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 예약 목록 조회
 * GET /api/bookings
 */
export async function GET(request: NextRequest) {
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

    // 2. Customer 정보 조회
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // 3. Bookings 조회 (결제 정보 포함)
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers!bookings_customer_id_fkey(
          id,
          profile:profiles(full_name, email)
        ),
        trainer:trainers(
          id,
          profile:profiles(full_name, email)
        ),
        payments(
          id,
          amount,
          currency,
          payment_method,
          payment_status,
          payment_provider,
          paid_at,
          created_at
        )
      `)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.error('Bookings fetch error:', bookingsError);
      return NextResponse.json(
        {
          error: 'Failed to fetch bookings',
          details: bookingsError.message,
          code: bookingsError.code,
          hint: bookingsError.hint
        },
        { status: 500 }
      );
    }

    // 4. 성공 응답
    return NextResponse.json({
      success: true,
      data: bookings || [],
    });

  } catch (error: unknown) {
    console.error('Bookings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
