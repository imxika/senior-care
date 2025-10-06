import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

// 쿠키 스토리지 어댑터
const cookieStorage = {
  getItem: (key: string) => {
    console.log('🍪 cookieStorage.getItem called with key:', key)
    if (typeof document === 'undefined') return null
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${key}=`))
    console.log('🍪 Cookie found:', !!cookie)
    if (!cookie) return null
    const value = cookie.split('=')[1]
    // base64- 접두사 제거
    const decoded = value.startsWith('base64-') ? atob(value.substring(7)) : value
    console.log('🍪 Decoded session length:', decoded?.length)
    return decoded
  },
  setItem: (key: string, value: string) => {
    if (typeof document === 'undefined') return
    // base64 인코딩
    const encoded = `base64-${btoa(value)}`
    document.cookie = `${key}=${encoded}; path=/; max-age=31536000; SameSite=Lax`
  },
  removeItem: (key: string) => {
    if (typeof document === 'undefined') return
    document.cookie = `${key}=; path=/; max-age=0`
  }
}

// 싱글톤 인스턴스
let supabaseInstance: SupabaseClient | null = null

// 싱글톤 클라이언트
export function createClient() {
  // 이미 인스턴스가 있으면 재사용
  if (supabaseInstance) {
    console.log('♻️ Reusing existing Supabase client')
    return supabaseInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  console.log('✨ Creating NEW Supabase client (cookie-based)')

  interface CookieStorage {
    getItem: (key: string) => string | null | Promise<string | null>
    setItem: (key: string, value: string) => void | Promise<void>
    removeItem: (key: string) => void | Promise<void>
  }

  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: cookieStorage as CookieStorage,
      storageKey: 'sb-dwyfxngmkhrqffnxdbcj-auth-token',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })

  return supabaseInstance
}
