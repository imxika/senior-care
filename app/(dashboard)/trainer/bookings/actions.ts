'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { BOOKING_STATUS } from '@/lib/constants'
import { combineDateTime } from '@/lib/utils'

export async function updateBookingStatus(
  bookingId: string,
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show',
  rejectionReason?: 'personal_emergency' | 'health_issue' | 'schedule_conflict' | 'distance_too_far' | 'customer_requirements' | 'other',
  rejectionNote?: string
) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: '로그인이 필요합니다.' }
  }

  // Get trainer.id from profile_id (docs/DATABASE_SCHEMA.md 참조)
  const { data: trainer } = await supabase
    .from('trainers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!trainer) {
    return { error: '트레이너 정보를 찾을 수 없습니다.' }
  }

  // RLS를 우회하기 위해 Service Role 사용 (고객 정보 조회용)
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Get booking with customer and trainer info (올바른 FK 참조)
  const { data: booking, error: fetchError } = await serviceSupabase
    .from('bookings')
    .select(`
      *,
      customer:customers!bookings_customer_id_fkey(
        id,
        profile:profiles!customers_profile_id_fkey(id, full_name)
      ),
      trainer:trainers!bookings_trainer_id_fkey(
        id,
        profile:profiles!trainers_profile_id_fkey(full_name)
      )
    `)
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    return { error: '예약을 찾을 수 없습니다.' }
  }

  // 올바른 권한 체크: booking.trainer_id vs trainer.id
  if (booking.trainer_id !== trainer.id) {
    return { error: '권한이 없습니다.' }
  }

  // Update booking status
  interface BookingUpdateData {
    status: string
    updated_at: string
    rejection_reason?: string
    rejection_note?: string
  }

  const updateData: BookingUpdateData = {
    status,
    updated_at: new Date().toISOString()
  }

  // 거절 시 사유 추가
  if (status === 'cancelled' && rejectionReason) {
    updateData.rejection_reason = rejectionReason
    if (rejectionNote) {
      updateData.rejection_note = rejectionNote
    }
  }

  const { error: updateError } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', bookingId)

  if (updateError) {
    console.error('Booking update error:', updateError)
    console.error('Error details:', {
      message: updateError.message,
      code: updateError.code,
      details: updateError.details,
      hint: updateError.hint
    })
    return { error: `예약 상태 업데이트 중 오류: ${updateError.message}` }
  }

  // Create notification for customer (utils 사용)
  const trainerName = booking.trainer?.profile?.full_name || '트레이너'
  const scheduledAt = combineDateTime(booking.booking_date, booking.start_time)
  const customerProfileId = booking.customer?.profile?.id

  console.log('📤 Sending notification to customer:', customerProfileId)
  console.log('📤 Trainer name:', trainerName)
  console.log('📤 Scheduled at:', scheduledAt)
  console.log('📤 Status:', status)

  if (!customerProfileId) {
    console.error('❌ Customer profile_id not found for notification')
  } else {
    try {
      if (status === 'confirmed') {
        const notification = notificationTemplates.bookingConfirmed(trainerName, scheduledAt)
        console.log('📤 Creating notification:', notification)
        const result = await createNotification({
          userId: customerProfileId,
          ...notification,
          link: `/customer/bookings/${bookingId}`
        })
        console.log('✅ Notification created:', result)
      } else if (status === 'cancelled') {
        const notification = notificationTemplates.bookingRejected(trainerName)
        const result = await createNotification({
          userId: customerProfileId,
          ...notification,
          link: `/customer/bookings/${bookingId}`
        })
        console.log('✅ Notification created:', result)
      } else if (status === 'completed') {
        const notification = notificationTemplates.bookingCompleted(trainerName)
        const result = await createNotification({
          userId: customerProfileId,
          ...notification,
          link: `/customer/bookings/${bookingId}`
        })
        console.log('✅ Notification created:', result)
      }
    } catch (error) {
      console.error('❌ Failed to create notification:', error)
    }
  }

  // 페이지 갱신
  revalidatePath('/trainer/bookings')
  revalidatePath(`/trainer/bookings/${bookingId}`)

  return { success: true }
}
