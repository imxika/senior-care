import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // 세션 유지 (새로고침 시에도 로그인 유지)
        persistSession: true,
        // 자동 토큰 갱신 비활성화 (30분 타임아웃 강제)
        autoRefreshToken: false,
        // URL에서 세션 감지
        detectSessionInUrl: true,
      }
    }
  )
}
