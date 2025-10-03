import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({
        error: '로그인이 필요합니다',
        redirect: '/login'
      }, { status: 401 })
    }

    // Admin 프로필 생성
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        user_type: 'admin',
        full_name: 'Admin User',
        phone: '010-0000-0000'
      })

    if (error) {
      return NextResponse.json({
        error: error.message,
        details: error
      }, { status: 500 })
    }

    // 성공 시 admin dashboard로 리다이렉트
    return NextResponse.redirect(new URL('/admin/dashboard', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
