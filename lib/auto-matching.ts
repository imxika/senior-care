/**
 * 자동 매칭 시스템
 *
 * 추천 예약 시 적합한 트레이너들에게 자동으로 알림을 발송하고
 * 선착순으로 매칭되도록 처리
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { scoreAndRankTrainers, selectTopTrainers, type TrainerForMatching, type BookingForMatching } from './matching-algorithm'

/**
 * 추천 예약에 적합한 트레이너 찾기 및 알림 발송
 */
export async function notifySuitableTrainers(bookingId: string) {
  console.log('🚀 [AUTO-MATCH] Starting auto-matching for booking:', bookingId)

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // 1. 예약 정보 가져오기
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_date,
      start_time,
      end_time,
      duration_minutes,
      service_type,
      session_type,
      max_participants,
      customer_notes,
      address_id,
      customer:customers!bookings_customer_id_fkey(
        id,
        profile:profiles!customers_profile_id_fkey(
          id,
          full_name
        ),
        addresses:customer_addresses!customer_addresses_customer_id_fkey(
          address,
          address_detail
        )
      )
    `)
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    console.error('❌ [AUTO-MATCH] Booking not found:', bookingError)
    return { error: '예약을 찾을 수 없습니다.' }
  }

  // 2. 고객 노트에서 specialty 추출
  const specialty = extractSpecialtyFromNotes(booking.customer_notes)

  // 3. 주소 정보 가져오기
  let address = ''
  if (booking.address_id) {
    const { data: addressData } = await supabase
      .from('customer_addresses')
      .select('address, address_detail')
      .eq('id', booking.address_id)
      .single()

    if (addressData) {
      address = addressData.address
    }
  }

  // 4. 활성화되고 인증된 모든 트레이너 가져오기
  const { data: trainers, error: trainersError } = await supabase
    .from('trainers')
    .select(`
      id,
      profile_id,
      years_experience,
      certifications,
      specialties,
      bio,
      hourly_rate,
      home_visit_available,
      center_visit_available,
      service_areas,
      profile:profiles!trainers_profile_id_fkey(
        full_name,
        avatar_url,
        phone,
        email
      )
    `)
    .eq('is_verified', true)
    .eq('is_active', true)

  if (trainersError || !trainers || trainers.length === 0) {
    console.error('❌ [AUTO-MATCH] No trainers found:', trainersError)
    return { error: '활성화된 트레이너가 없습니다.' }
  }

  console.log(`📊 [AUTO-MATCH] Found ${trainers.length} active trainers`)

  // 5. 트레이너별 예약 카운트 가져오기 (부하 분산용)
  const { data: bookingCounts } = await supabase
    .from('bookings')
    .select('trainer_id')
    .in('status', ['pending', 'confirmed', 'in_progress'])
    .gte('booking_date', booking.booking_date)

  const trainerBookingCounts: Record<string, number> = {}
  bookingCounts?.forEach(b => {
    if (b.trainer_id) {
      trainerBookingCounts[b.trainer_id] = (trainerBookingCounts[b.trainer_id] || 0) + 1
    }
  })

  // 6. Normalize trainers (handle profile array/object from Supabase)
  const normalizedTrainers: TrainerForMatching[] = trainers.map(t => ({
    ...t,
    profile: Array.isArray(t.profile) ? t.profile[0] : t.profile
  }))

  // 7. 트레이너 점수 계산 및 정렬
  const bookingForMatching: BookingForMatching = {
    serviceType: booking.service_type,
    specialty,
    address,
    bookingDate: booking.booking_date,
    startTime: booking.start_time,
    endTime: booking.end_time
  }

  const scoredTrainers = scoreAndRankTrainers(
    normalizedTrainers,
    bookingForMatching,
    trainerBookingCounts
  )

  // 8. 상위 10명 선택 (예산 내 우선)
  const selectedTrainers = selectTopTrainers(scoredTrainers, 10)

  console.log(`🎯 [AUTO-MATCH] Selected ${selectedTrainers.length} trainers for notification`)
  console.log('Top 3 trainers:', selectedTrainers.slice(0, 3).map(t => ({
    name: t.profile?.full_name,
    score: t.matchScore,
    reasons: t.matchReasons
  })))

  if (selectedTrainers.length === 0) {
    console.warn('⚠️ [AUTO-MATCH] No suitable trainers found')
    return { error: '적합한 트레이너를 찾을 수 없습니다.' }
  }

  // 9. pending_trainer_ids 업데이트 + 30분 마감시간 설정
  const pendingTrainerIds = selectedTrainers.map(t => t.id)
  const autoMatchDeadline = new Date(Date.now() + 30 * 60 * 1000) // 30분 후

  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      pending_trainer_ids: pendingTrainerIds,
      notified_at: new Date().toISOString(),
      auto_match_deadline: autoMatchDeadline.toISOString(),
      fallback_to_admin: false
    })
    .eq('id', bookingId)

  if (updateError) {
    console.error('❌ [AUTO-MATCH] Failed to update booking:', updateError)
    return { error: 'booking 업데이트 실패' }
  }

  // 10. 모든 선택된 트레이너에게 알림 발송 (병렬)
  // Handle customer profile (can be array or object from Supabase)
  const customerData = booking.customer && typeof booking.customer === 'object'
    ? (Array.isArray(booking.customer) ? booking.customer[0] : booking.customer)
    : null
  const customerProfile = customerData && typeof customerData === 'object' && 'profile' in customerData
    ? (Array.isArray(customerData.profile) ? customerData.profile[0] : customerData.profile)
    : null
  const customerName = customerProfile && typeof customerProfile === 'object' && 'full_name' in customerProfile
    ? (customerProfile.full_name as string) || '고객'
    : '고객'
  const scheduledAt = new Date(`${booking.booking_date}T${booking.start_time}`)

  console.log('👤 [AUTO-MATCH] Customer info:', {
    customerName,
    scheduledAt: scheduledAt.toISOString(),
    serviceType: booking.service_type
  })

  const notificationResults = await Promise.allSettled(
    selectedTrainers.map(async (trainer) => {
      console.log(`📧 [AUTO-MATCH] Sending notification to trainer: ${trainer.profile?.full_name} (${trainer.profile_id})`)

      // 알림 생성
      const notification = notificationTemplates.newBookingRequest(
        customerName,
        scheduledAt,
        booking.service_type === 'home_visit' ? '방문' : '센터',
        `${booking.duration_minutes}분`
      )

      console.log(`📝 [AUTO-MATCH] Notification template:`, {
        title: notification.title,
        message: notification.message,
        type: notification.type,
        userId: trainer.profile_id
      })

      const result = await createNotification({
        userId: trainer.profile_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: `/trainer/bookings/requests/${bookingId}` // 새로운 요청 페이지
      })

      console.log(`📬 [AUTO-MATCH] Notification result for ${trainer.profile?.full_name}:`, result)

      // 응답 로그 기록 (notified)
      const { error: responseError } = await supabase
        .from('trainer_match_responses')
        .insert({
          booking_id: bookingId,
          trainer_id: trainer.id,
          response_type: 'notified'
        })

      if (responseError) {
        console.error(`❌ [AUTO-MATCH] Failed to log response for ${trainer.profile?.full_name}:`, responseError)
      }

      console.log(`✅ [AUTO-MATCH] Notified trainer: ${trainer.profile?.full_name} (score: ${trainer.matchScore})`)

      return result
    })
  )

  const successCount = notificationResults.filter(r => r.status === 'fulfilled').length
  const failCount = notificationResults.filter(r => r.status === 'rejected').length

  console.log(`📧 [AUTO-MATCH] Notification results: ${successCount} success, ${failCount} failed`)
  console.log(`⏰ [AUTO-MATCH] Auto-match deadline: ${autoMatchDeadline.toISOString()}`)

  return {
    success: true,
    notifiedCount: successCount,
    deadline: autoMatchDeadline.toISOString()
  }
}

/**
 * 고객 노트에서 specialty 추출
 */
function extractSpecialtyFromNotes(notes: string | null): string {
  if (!notes) return ''

  // "[요청 정보]\n필요 전문분야: ..." 형식에서 추출
  const match = notes.match(/필요 전문분야:\s*(.+)/i)
  return match ? match[1].trim() : ''
}
