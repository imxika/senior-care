'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createNotification, notificationTemplates } from '@/lib/notifications'

export async function createBooking(formData: FormData) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: '로그인이 필요합니다.' }
  }

  // Extract form data
  const trainerId = formData.get('trainer_id') as string
  const date = formData.get('date') as string
  const time = formData.get('time') as string
  const serviceType = formData.get('service_type') as string
  const duration = parseInt(formData.get('duration') as string)
  const notes = formData.get('notes') as string

  // Validate required fields
  if (!trainerId || !date || !time || !serviceType || !duration) {
    return { error: '필수 항목을 모두 입력해주세요.' }
  }

  // Combine date and time
  const scheduledAt = new Date(`${date}T${time}:00`)

  // Get customer and trainer info for notification
  const { data: customer } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: trainer } = await supabase
    .from('trainers')
    .select('profile_id')
    .eq('id', trainerId)
    .single()

  // Insert booking
  const { data: booking, error: insertError } = await supabase
    .from('bookings')
    .insert({
      customer_id: user.id,
      trainer_id: trainerId,
      scheduled_at: scheduledAt.toISOString(),
      service_type: serviceType,
      duration_minutes: duration,
      notes: notes || null,
      status: 'pending'
    })
    .select()
    .single()

  if (insertError) {
    console.error('Booking creation error:', insertError)
    return { error: '예약 생성 중 오류가 발생했습니다.' }
  }

  // Create notification for trainer
  const customerName = customer?.full_name || '고객'
  const notification = notificationTemplates.bookingPending(customerName, scheduledAt)

  if (trainer?.profile_id) {
    await createNotification({
      userId: trainer.profile_id,
      ...notification,
      relatedId: booking.id
    })
  }

  // Redirect to customer bookings page
  redirect('/customer/bookings')
}
