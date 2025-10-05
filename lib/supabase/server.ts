import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // 세션 쿠키로 설정 (브라우저 닫으면 자동 삭제)
              cookieStore.set(name, value, {
                ...options,
                maxAge: undefined, // maxAge 제거
                expires: undefined, // expires 제거
                // 세션 쿠키는 maxAge와 expires가 없으면 브라우저 세션 동안만 유지
              })
            })
          } catch {
            // Server Component에서는 무시
          }
        },
      },
    }
  )
}
