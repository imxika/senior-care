'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { combineDateTime } from '@/lib/utils'

/**
 * 트레이너가 추천 예약 요청을 선착순으로 승인
 * Optimistic Lock으로 동시성 제어
 */
export async function acceptBookingRequest(bookingId: string) {
  console.log('🎯 [ACCEPT-REQUEST] Starting:', bookingId)

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

  // 1. 현재 트레이너 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { data: trainer } = await supabase
    .from('trainers')
    .select('id, profile_id, hourly_rate, profile:profiles!trainers_profile_id_fkey(full_name)')
    .eq('profile_id', user.id)
    .single()

  if (!trainer) {
    return { error: '트레이너 정보를 찾을 수 없습니다.' }
  }

  console.log('👤 [ACCEPT-REQUEST] Trainer:', trainer.profile?.full_name, trainer.id)

  // 2. 예약 정보 확인
  const { data: booking } = await serviceSupabase
    .from('bookings')
    .select(`
      id,
      booking_type,
      matching_status,
      trainer_id,
      pending_trainer_ids,
      booking_date,
      start_time,
      duration_minutes,
      session_type,
      service_type,
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

  // 3. 추천 예약인지 확인
  if (booking.booking_type !== 'recommended') {
    return { error: '추천 예약이 아닙니다.' }
  }

  // 4. 이 트레이너가 알림을 받은 트레이너 목록에 있는지 확인
  if (!booking.pending_trainer_ids?.includes(trainer.id)) {
    return { error: '이 예약에 대한 권한이 없습니다.' }
  }

  // 5. 이미 매칭되었는지 확인
  if (booking.matching_status !== 'pending' || booking.trainer_id) {
    console.log('⚠️ [ACCEPT-REQUEST] Already matched to:', booking.trainer_id)

    // 응답 로그 기록 (too_late)
    await serviceSupabase
      .from('trainer_match_responses')
      .insert({
        booking_id: bookingId,
        trainer_id: trainer.id,
        response_type: 'too_late'
      })

    return { error: '이미 다른 트레이너가 수락했습니다.' }
  }

  console.log('🔒 [ACCEPT-REQUEST] Attempting optimistic lock...')

  // 6. Optimistic Lock으로 선착순 매칭 (트랜잭션)
  const { data: updatedBooking, error: updateError } = await serviceSupabase
    .from('bookings')
    .update({
      trainer_id: trainer.id,
      matching_status: 'approved',
      status: 'confirmed',
      trainer_confirmed_at: new Date().toISOString(),
      // 가격 계산 (trainer hourly_rate 사용)
      price_per_person: trainer.hourly_rate || 100000,
      total_price: (trainer.hourly_rate || 100000) * (booking.session_type === '1:1' ? 1 : booking.session_type === '2:1' ? 2 : 3)
    })
    .eq('id', bookingId)
    .eq('matching_status', 'pending')  // ⚠️ 중요: pending인 경우에만 업데이트
    .is('trainer_id', null)            // ⚠️ 중요: trainer_id가 NULL인 경우에만
    .select()
    .single()

  if (updateError || !updatedBooking) {
    console.error('❌ [ACCEPT-REQUEST] Update failed:', updateError)

    // 다른 트레이너가 먼저 선점함
    await serviceSupabase
      .from('trainer_match_responses')
      .insert({
        booking_id: bookingId,
        trainer_id: trainer.id,
        response_type: 'too_late'
      })

    return { error: '이미 다른 트레이너가 먼저 수락했습니다.' }
  }

  console.log('✅ [ACCEPT-REQUEST] Successfully matched!')

  // 7. 응답 로그 기록 (accepted)
  await serviceSupabase
    .from('trainer_match_responses')
    .insert({
      booking_id: bookingId,
      trainer_id: trainer.id,
      response_type: 'accepted'
    })

  // 8. 고객에게 확정 알림
  const customerProfileId = (booking.customer as any).profile?.id
  const customerName = (booking.customer as any).profile?.full_name || '고객'
  const trainerName = trainer.profile?.full_name || '트레이너'
  const scheduledAt = combineDateTime(booking.booking_date, booking.start_time)

  if (customerProfileId) {
    const notification = notificationTemplates.bookingConfirmed(trainerName, scheduledAt)
    await createNotification({
      userId: customerProfileId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      link: `/customer/bookings/${bookingId}`
    })
    console.log('📧 [ACCEPT-REQUEST] Customer notified')
  }

  // 9. 페이지 갱신
  revalidatePath('/trainer/bookings')
  revalidatePath(`/trainer/bookings/${bookingId}`)
  revalidatePath('/customer/bookings')

  console.log('🎉 [ACCEPT-REQUEST] Complete!')

  return { success: true }
}

/**
 * 트레이너가 추천 예약 요청을 거절
 */
export async function declineBookingRequest(
  bookingId: string,
  reason?: 'schedule_conflict' | 'distance_too_far' | 'customer_requirements' | 'personal_emergency' | 'other',
  note?: string
) {
  console.log('❌ [DECLINE-REQUEST] Starting:', bookingId)

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

  // 1. 현재 트레이너 정보
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { data: trainer } = await supabase
    .from('trainers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!trainer) {
    return { error: '트레이너 정보를 찾을 수 없습니다.' }
  }

  // 2. 응답 로그 기록 (declined)
  await serviceSupabase
    .from('trainer_match_responses')
    .insert({
      booking_id: bookingId,
      trainer_id: trainer.id,
      response_type: 'declined',
      decline_reason: reason,
      decline_note: note
    })

  console.log('✅ [DECLINE-REQUEST] Decline recorded')

  revalidatePath('/trainer/bookings')

  return { success: true }
}
