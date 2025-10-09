"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { ActionResponse } from "@/lib/types"
import { createNotification, notificationTemplates } from "@/lib/notifications"

/**
 * 추천 예약에 트레이너 매칭
 */
export async function matchTrainerToBooking(
  bookingId: string,
  trainerId: string
): Promise<ActionResponse> {
  console.log('🚀🚀🚀 matchTrainerToBooking CALLED - START 🚀🚀🚀')
  console.log('Input params:', { bookingId, trainerId })

  const supabase = await createClient()

  // 현재 사용자 확인 (Admin)
  const { data: { user } } = await supabase.auth.getUser()
  console.log('Current user:', user?.id)
  if (!user) {
    return { error: "로그인이 필요합니다." }
  }

  // Admin 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'admin') {
    return { error: "관리자 권한이 필요합니다." }
  }

  // 예약 정보 확인 (고객 정보 포함)
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_type,
      trainer_id,
      status,
      booking_date,
      start_time,
      customer_id,
      customer:customers!bookings_customer_id_fkey(
        id,
        profile_id
      )
    `)
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    return { error: "예약을 찾을 수 없습니다." }
  }

  // 추천 예약인지 확인
  if (booking.booking_type !== 'recommended') {
    return { error: "추천 예약이 아닙니다." }
  }

  // 이미 매칭된 경우
  if (booking.trainer_id) {
    return { error: "이미 트레이너가 매칭되었습니다." }
  }

  // 트레이너 확인 (프로필 정보 포함)
  const { data: trainer, error: trainerError } = await supabase
    .from('trainers')
    .select(`
      id,
      is_verified,
      is_active,
      hourly_rate,
      profile_id,
      profiles!trainers_profile_id_fkey(
        full_name
      )
    `)
    .eq('id', trainerId)
    .single()

  if (trainerError || !trainer) {
    console.error('Trainer fetch error:', trainerError)
    return { error: "트레이너를 찾을 수 없습니다." }
  }

  if (!trainer.is_verified || !trainer.is_active) {
    return { error: "활성화되지 않은 트레이너입니다." }
  }

  // hourly_rate가 없으면 경고 (매칭은 가능)
  if (!trainer.hourly_rate) {
    console.warn('Trainer has no hourly_rate set:', trainerId)
  }

  // 예약 업데이트 (트레이너 매칭)
  console.log('Attempting to update booking:', {
    bookingId,
    trainerId,
    adminId: user.id
  })

  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      trainer_id: trainerId,
      status: 'pending',  // 트레이너 승인 대기 상태로 유지
      matching_status: 'matched',  // 트레이너 매칭 완료
      admin_matched_at: new Date().toISOString(),
      admin_matched_by: user.id
    })
    .eq('id', bookingId)

  if (updateError) {
    console.error('❌❌❌ Booking update error:', updateError)
    console.error('Error details:', JSON.stringify(updateError, null, 2))
    return { error: `트레이너 매칭에 실패했습니다: ${updateError.message}` }
  }

  console.log('✅ Booking update successful!')

  // 고객 이름 조회
  console.log('🔔🔔🔔 Starting notification creation...')
  const customerData = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer
  console.log('Customer profile_id:', customerData?.profile_id)
  console.log('Trainer profile_id:', trainer.profile_id)

  const { data: customerProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', customerData?.profile_id)
    .single()

  console.log('Customer profile:', customerProfile)

  // 알림 생성
  const scheduledAt = new Date(`${booking.booking_date}T${booking.start_time}`)
  const trainerName = (trainer.profiles as any)?.full_name || '트레이너'
  const customerName = (customerProfile as any)?.full_name || '고객'

  console.log('Creating notifications for:', { customerName, trainerName })

  // 1. 고객에게 알림: 트레이너가 매칭되었습니다
  const customerNotif = notificationTemplates.trainerMatchedToCustomer(trainerName, scheduledAt)
  console.log('Customer notification:', customerNotif)

  const customerResult = await createNotification({
    userId: customerData?.profile_id,
    title: customerNotif.title,
    message: customerNotif.message,
    type: customerNotif.type,
    link: `/customer/bookings/${bookingId}`
  })
  console.log('Customer notification result:', customerResult)

  // 2. 트레이너에게 알림: 새 예약이 배정되었습니다
  const trainerNotif = notificationTemplates.matchedToTrainer(customerName, scheduledAt)
  console.log('Trainer notification:', trainerNotif)

  const trainerResult = await createNotification({
    userId: trainer.profile_id,
    title: trainerNotif.title,
    message: trainerNotif.message,
    type: trainerNotif.type,
    link: `/trainer/bookings/${bookingId}`
  })
  console.log('Trainer notification result:', trainerResult)

  console.log('✅ Notifications created for booking match:', {
    bookingId,
    customer: customerName,
    trainer: trainerName,
    customerNotification: customerResult,
    trainerNotification: trainerResult
  })

  console.log('🎯 Revalidating paths...')
  revalidatePath('/admin/bookings/recommended')
  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath('/trainer/bookings')

  console.log('🚀🚀🚀 matchTrainerToBooking COMPLETE - SUCCESS 🚀🚀🚀')
  return { success: true }
}
