"use server"

import { createClient } from '@/lib/supabase/server'

/**
 * 현재 사용자의 읽지 않은 알림 개수 조회
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) {
    console.error('Failed to get unread notification count:', error)
    return 0
  }

  return count || 0
}

/**
 * 현재 사용자의 최근 알림 목록 조회
 */
export async function getRecentNotifications(limit: number = 5) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to get notifications:', error)
    return []
  }

  return data || []
}

/**
 * 알림을 읽음 처리
 */
export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId)

  if (error) {
    console.error('Failed to mark notification as read:', error)
    return { error: error.message }
  }

  return { success: true }
}

/**
 * 모든 알림을 읽음 처리
 */
export async function markAllNotificationsAsRead() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) {
    console.error('Failed to mark all notifications as read:', error)
    return { error: error.message }
  }

  return { success: true }
}
