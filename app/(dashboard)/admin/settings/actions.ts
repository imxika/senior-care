'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface NotificationSettings {
  recommended_booking_enabled: boolean
  direct_booking_enabled: boolean
  booking_matched_enabled: boolean
  booking_confirmed_enabled: boolean
  booking_cancelled_enabled: boolean
}

export async function updateNotificationSettings(settings: NotificationSettings) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  // 관리자 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'admin') {
    return { success: false, error: '관리자 권한이 필요합니다.' }
  }

  // 기존 설정 확인
  const { data: existingSettings } = await supabase
    .from('notification_settings')
    .select('id')
    .eq('user_id', user.id)
    .single()

  let error

  if (existingSettings) {
    // 업데이트
    const result = await supabase
      .from('notification_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    error = result.error
  } else {
    // 생성
    const result = await supabase
      .from('notification_settings')
      .insert({
        user_id: user.id,
        ...settings,
      })

    error = result.error
  }

  if (error) {
    console.error('Failed to update notification settings:', error)
    return { success: false, error: '설정 저장에 실패했습니다.' }
  }

  revalidatePath('/admin/settings')

  return { success: true }
}
