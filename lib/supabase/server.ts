import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
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
              // 30분 타임아웃 설정
              cookieStore.set(name, value, {
                ...options,
                maxAge: 30 * 60, // 30분 (초 단위)
                sameSite: 'lax',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
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

// Service Role 클라이언트 (RLS 우회) - 서버 사이드 전용
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  )
}
