import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 성공: 홈페이지로 리다이렉트
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 에러 발생: 로그인 페이지로 돌아가기
  return NextResponse.redirect(`${origin}/login`)
}
