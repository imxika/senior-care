import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 인증 상태 확인
 * GET /api/auth/status
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        isAuthenticated: false,
        user: null,
        customer: null,
      });
    }

    // Customer 정보 조회
    const { data: customer } = await supabase
      .from('customers')
      .select('id, full_name, guardian_name, guardian_phone, age, gender, mobility_level')
      .eq('profile_id', user.id)
      .single();

    return NextResponse.json({
      isAuthenticated: true,
      user: {
        id: user.id,
        email: user.email,
      },
      customer: customer || null,
    });

  } catch (error: any) {
    console.error('Auth status check error:', error);
    return NextResponse.json({
      isAuthenticated: false,
      user: null,
      customer: null,
    });
  }
}
