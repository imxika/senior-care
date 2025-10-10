'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { BOOKING_STATUS, BOOKING_CONFIG } from '@/lib/constants'
import { combineDateTime, getHoursUntilBooking } from '@/lib/utils'

export async function cancelBooking(bookingId: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: '로그인이 필요합니다.' }
  }

  // Get customer.id from profile_id (docs/DATABASE_SCHEMA.md 참조)
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!customer) {
    return { error: '고객 정보를 찾을 수 없습니다.' }
  }

  // Get booking with customer and trainer info
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:customers!bookings_customer_id_fkey(
        id,
        profiles!customers_profile_id_fkey(full_name)
      ),
      trainer:trainers!bookings_trainer_id_fkey(
        id,
        profile_id,
        profiles!trainers_profile_id_fkey(full_name)
      )
    `)
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    console.error('Booking fetch error:', fetchError)
    return { error: '예약을 찾을 수 없습니다.' }
  }

  // Check ownership: booking.customer_id는 customers.id를 참조 (docs 참조)
  if (booking.customer_id !== customer.id) {
    return { error: '권한이 없습니다.' }
  }

  // Check if booking can be cancelled (constants 사용)
  if (booking.status === BOOKING_STATUS.COMPLETED || booking.status === BOOKING_STATUS.CANCELLED) {
    return { error: '이미 완료되었거나 취소된 예약입니다.' }
  }

  // Check if booking is at least 24 hours away (utils 사용)
  const hoursUntilBooking = getHoursUntilBooking(booking)
  const scheduledTime = combineDateTime(booking.booking_date, booking.start_time)

  if (hoursUntilBooking < BOOKING_CONFIG.CANCELLATION_HOURS) {
    return { error: `예약 ${BOOKING_CONFIG.CANCELLATION_HOURS}시간 전까지만 취소가 가능합니다.` }
  }

  // Update booking status to cancelled (constants 사용)
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: BOOKING_STATUS.CANCELLED,
      cancelled_by: user.id,  // profiles.id 저장
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)

  if (updateError) {
    console.error('Booking cancellation error:', updateError)
    return { error: `예약 취소 중 오류가 발생했습니다: ${updateError.message}` }
  }

  // Create notification for trainer
  const customerName = booking.customer?.profiles?.full_name || '고객'
  const notification = notificationTemplates.bookingCancelledByCustomer(customerName, scheduledTime)

  if (booking.trainer?.profile_id) {
    await createNotification({
      userId: booking.trainer.profile_id,
      ...notification,
      link: `/trainer/bookings/${bookingId}`
    })
  }

  // Revalidate the page
  revalidatePath('/customer/bookings')

  return { success: true }
}
