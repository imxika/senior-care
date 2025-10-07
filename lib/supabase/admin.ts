import { createClient } from '@supabase/supabase-js'

/**
 * Admin용 Supabase 클라이언트 (Service Role)
 * RLS를 우회하여 모든 데이터에 접근 가능
 *
 * 주의: 서버 사이드에서만 사용해야 합니다!
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for admin client')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
