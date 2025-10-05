import { createClient } from '@/lib/supabase/server'

export interface NotificationSettings {
  recommended_booking_enabled: boolean
  direct_booking_enabled: boolean
  booking_matched_enabled: boolean
  booking_confirmed_enabled: boolean
  booking_cancelled_enabled: boolean
}

/**
 * 사용자의 알림 설정을 가져옵니다.
 * 설정이 없으면 기본값(모두 true)을 반환합니다.
 */
export async function getNotificationSettings(userId: string): Promise<NotificationSettings> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    // 설정이 없으면 기본값 반환
    return {
      recommended_booking_enabled: true,
      direct_booking_enabled: true,
      booking_matched_enabled: true,
      booking_confirmed_enabled: true,
      booking_cancelled_enabled: true,
    }
  }

  return {
    recommended_booking_enabled: data.recommended_booking_enabled,
    direct_booking_enabled: data.direct_booking_enabled,
    booking_matched_enabled: data.booking_matched_enabled,
    booking_confirmed_enabled: data.booking_confirmed_enabled,
    booking_cancelled_enabled: data.booking_cancelled_enabled,
  }
}

/**
 * 특정 알림 타입이 활성화되어 있는지 확인합니다.
 */
export async function isNotificationEnabled(
  userId: string,
  notificationType: keyof NotificationSettings
): Promise<boolean> {
  const settings = await getNotificationSettings(userId)
  return settings[notificationType]
}
