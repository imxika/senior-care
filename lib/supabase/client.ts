import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // 쿠키 옵션 생략 - 자동으로 로컬스토리지 사용
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
