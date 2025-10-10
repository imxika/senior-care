'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { createNotification, notificationTemplates } from '@/lib/notifications'

/**
 * Admin이 예약을 강제 취소
 */
export async function adminCancelBooking(bookingId: string, reason: string) {
  console.log('🚫 [ADMIN-CANCEL] Starting:', bookingId)

  const supabase = await createClient()
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

  // 1. Admin 권한 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'admin') {
    return { error: '관리자 권한이 필요합니다.' }
  }

  // 2. 예약 정보 가져오기
  const { data: booking } = await serviceSupabase
    .from('bookings')
    .select(`
      id,
      status,
      total_price,
      customer:customers!bookings_customer_id_fkey(
        id,
        profile:profiles!customers_profile_id_fkey(
          id,
          full_name
        )
      )
    `)
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return { error: '예약을 찾을 수 없습니다.' }
  }

  // 3. 예약 취소
  const { error: updateError } = await serviceSupabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_by: user.id,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason
    })
    .eq('id', bookingId)

  if (updateError) {
    console.error('❌ [ADMIN-CANCEL] Update error:', updateError)
    return { error: '예약 취소에 실패했습니다.' }
  }

  // 4. 고객에게 알림
  const customerProfileId = (booking.customer as any)?.profile?.id
  if (customerProfileId) {
    await createNotification({
      userId: customerProfileId,
      title: '예약이 취소되었습니다',
      message: `예약이 관리자에 의해 취소되었습니다. 사유: ${reason}`,
      type: 'booking_cancelled',
      link: `/customer/bookings/${bookingId}`
    })
  }

  console.log('✅ [ADMIN-CANCEL] Complete')

  revalidatePath('/admin/bookings/auto-matching')
  revalidatePath('/admin/bookings')

  return { success: true }
}

/**
 * Admin이 수동으로 재매칭 (기존 트레이너 해제 후 새 트레이너 배정)
 */
export async function adminRematchBooking(bookingId: string, newTrainerId: string) {
  console.log('🔄 [ADMIN-REMATCH] Starting:', bookingId, '→', newTrainerId)

  const supabase = await createClient()
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

  // 1. Admin 권한 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'admin') {
    return { error: '관리자 권한이 필요합니다.' }
  }

  // 2. 예약 정보
  const { data: booking } = await serviceSupabase
    .from('bookings')
    .select(`
      id,
      trainer_id,
      booking_date,
      start_time,
      customer:customers!bookings_customer_id_fkey(
        profile:profiles!customers_profile_id_fkey(id, full_name)
      ),
      old_trainer:trainers!bookings_trainer_id_fkey(
        profile:profiles!trainers_profile_id_fkey(id, full_name)
      )
    `)
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return { error: '예약을 찾을 수 없습니다.' }
  }

  // 3. 새 트레이너 정보
  const { data: newTrainer } = await serviceSupabase
    .from('trainers')
    .select('id, profile_id, hourly_rate, profile:profiles!trainers_profile_id_fkey(full_name)')
    .eq('id', newTrainerId)
    .single()

  if (!newTrainer) {
    return { error: '트레이너를 찾을 수 없습니다.' }
  }

  // 4. 재매칭
  const { error: updateError } = await serviceSupabase
    .from('bookings')
    .update({
      trainer_id: newTrainerId,
      matching_status: 'matched',
      status: 'pending',
      admin_matched_at: new Date().toISOString(),
      admin_matched_by: user.id
    })
    .eq('id', bookingId)

  if (updateError) {
    console.error('❌ [ADMIN-REMATCH] Update error:', updateError)
    return { error: '재매칭에 실패했습니다.' }
  }

  // 5. 알림
  const customerName = (booking.customer as any)?.profile?.full_name || '고객'
  const newTrainerName = newTrainer.profile?.full_name || '트레이너'
  const scheduledAt = new Date(`${booking.booking_date}T${booking.start_time}`)

  // 기존 트레이너에게 알림 (있는 경우)
  if (booking.trainer_id && (booking.old_trainer as any)?.profile?.id) {
    await createNotification({
      userId: (booking.old_trainer as any).profile.id,
      title: '예약이 재배정되었습니다',
      message: `${customerName}님의 예약이 관리자에 의해 다른 트레이너에게 재배정되었습니다.`,
      type: 'booking_cancelled',
      link: `/trainer/bookings/${bookingId}`
    })
  }

  // 새 트레이너에게 알림
  const notification = notificationTemplates.matchedToTrainer(customerName, scheduledAt)
  await createNotification({
    userId: newTrainer.profile_id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    link: `/trainer/bookings/${bookingId}`
  })

  // 고객에게 알림
  const customerProfileId = (booking.customer as any)?.profile?.id
  if (customerProfileId) {
    const customerNotif = notificationTemplates.trainerMatchedToCustomer(newTrainerName, scheduledAt)
    await createNotification({
      userId: customerProfileId,
      title: customerNotif.title,
      message: customerNotif.message,
      type: customerNotif.type,
      link: `/customer/bookings/${bookingId}`
    })
  }

  console.log('✅ [ADMIN-REMATCH] Complete')

  revalidatePath('/admin/bookings/auto-matching')
  revalidatePath('/admin/bookings')
  revalidatePath(`/admin/bookings/${bookingId}`)

  return { success: true }
}
