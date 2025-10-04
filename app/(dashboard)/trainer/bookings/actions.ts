'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification, notificationTemplates } from '@/lib/notifications'

export async function updateBookingStatus(bookingId: string, status: 'confirmed' | 'rejected' | 'completed' | 'no_show') {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: '로그인이 필요합니다.' }
  }

  // Get booking with customer and trainer info
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:profiles!bookings_customer_id_fkey(id, full_name),
      trainer:trainers(
        id,
        profiles!trainers_profile_id_fkey(full_name)
      )
    `)
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    return { error: '예약을 찾을 수 없습니다.' }
  }

  if (booking.trainer_id !== user.id) {
    return { error: '권한이 없습니다.' }
  }

  // Update booking status
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)

  if (updateError) {
    console.error('Booking update error:', updateError)
    return { error: '예약 상태 업데이트 중 오류가 발생했습니다.' }
  }

  // Create notification for customer
  const trainerName = booking.trainer?.profiles?.full_name || '트레이너'
  const scheduledAt = new Date(booking.scheduled_at)

  if (status === 'confirmed') {
    const notification = notificationTemplates.bookingConfirmed(trainerName, scheduledAt)
    await createNotification({
      userId: booking.customer_id,
      ...notification,
      relatedId: bookingId
    })
  } else if (status === 'rejected') {
    const notification = notificationTemplates.bookingRejected(trainerName)
    await createNotification({
      userId: booking.customer_id,
      ...notification,
      relatedId: bookingId
    })
  } else if (status === 'completed') {
    const notification = notificationTemplates.bookingCompleted(trainerName)
    await createNotification({
      userId: booking.customer_id,
      ...notification,
      relatedId: bookingId
    })
  }

  // Revalidate the page
  revalidatePath('/trainer/bookings')

  return { success: true }
}
