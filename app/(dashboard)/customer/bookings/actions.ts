'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification, notificationTemplates } from '@/lib/notifications'

export async function cancelBooking(bookingId: string) {
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
        profile_id,
        profiles!trainers_profile_id_fkey(full_name)
      )
    `)
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    return { error: '예약을 찾을 수 없습니다.' }
  }

  if (booking.customer_id !== user.id) {
    return { error: '권한이 없습니다.' }
  }

  // Check if booking can be cancelled (not already completed or cancelled)
  if (booking.status === 'completed' || booking.status === 'cancelled') {
    return { error: '이미 완료되었거나 취소된 예약입니다.' }
  }

  // Check if booking is at least 24 hours away
  const scheduledTime = new Date(booking.scheduled_at)
  const now = new Date()
  const hoursUntilBooking = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursUntilBooking < 24) {
    return { error: '예약 24시간 전까지만 취소가 가능합니다.' }
  }

  // Update booking status to cancelled
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)

  if (updateError) {
    console.error('Booking cancellation error:', updateError)
    return { error: '예약 취소 중 오류가 발생했습니다.' }
  }

  // Create notification for trainer
  const customerName = booking.customer?.full_name || '고객'
  const notification = notificationTemplates.bookingCancelledByCustomer(customerName, scheduledTime)

  if (booking.trainer?.profile_id) {
    await createNotification({
      userId: booking.trainer.profile_id,
      ...notification,
      relatedId: bookingId
    })
  }

  // Revalidate the page
  revalidatePath('/customer/bookings')

  return { success: true }
}
