'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateNotificationSettings(formData: FormData) {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '인증이 필요합니다' }
  }

  // 고객 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'customer') {
    return { error: '고객 권한이 필요합니다' }
  }

  // 고객 정보 가져오기
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!customer) {
    return { error: '고객 정보를 찾을 수 없습니다' }
  }

  // 폼 데이터 추출
  const emailBooking = formData.get('email_booking') === 'true'
  const emailReview = formData.get('email_review') === 'true'
  const emailMarketing = formData.get('email_marketing') === 'true'
  const pushBooking = formData.get('push_booking') === 'true'
  const pushReview = formData.get('push_review') === 'true'

  // 알림 설정 업데이트
  const { error } = await supabase
    .from('customers')
    .update({
      email_booking_notifications: emailBooking,
      email_review_notifications: emailReview,
      email_marketing_notifications: emailMarketing,
      push_booking_notifications: pushBooking,
      push_review_notifications: pushReview,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customer.id)

  if (error) {
    console.error('알림 설정 업데이트 오류:', error)
    return { error: '알림 설정 업데이트에 실패했습니다' }
  }

  revalidatePath('/customer/settings/notifications')
  return { success: true }
}
