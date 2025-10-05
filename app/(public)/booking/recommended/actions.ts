"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { mapFormServiceTypeToDb, calculateTimeRange } from "@/lib/utils"
import { BOOKING_TYPE, BOOKING_TYPE_CONFIG } from "@/lib/constants"
import type { ActionResponse } from "@/lib/types"
import { createNotification } from "@/lib/notifications"
import { isNotificationEnabled } from "@/lib/notification-settings"

export async function createRecommendedBooking(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()

  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "로그인이 필요합니다." }
  }

  // 폼 데이터 추출
  const date = formData.get('date') as string
  const time = formData.get('time') as string
  const service_type = formData.get('service_type') as 'home' | 'center'
  const duration = parseInt(formData.get('duration') as string)
  const notes = formData.get('notes') as string || ''
  const address = formData.get('address') as string || ''
  const specialty_needed = formData.get('specialty_needed') as string || ''

  // 고객 ID 조회
  let { data: customerData } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  // 고객 레코드가 없으면 생성
  if (!customerData) {
    console.log('[DEBUG] Creating customer for user:', user.id)
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({ profile_id: user.id })
      .select('id')
      .single()

    if (customerError || !newCustomer) {
      console.error('[ERROR] Customer creation failed:', customerError)
      return {
        error: `고객 정보 생성에 실패했습니다. ${customerError?.message || ''}`,
        details: customerError
      }
    }
    console.log('[DEBUG] Customer created:', newCustomer)
    customerData = newCustomer
  }

  // 시작/종료 시간 계산
  const booking_date = date
  const booking_datetime = new Date(`${date}T${time}`)
  const { start_time, end_time } = calculateTimeRange(booking_datetime, duration)

  // 서비스 타입 변환
  const db_service_type = mapFormServiceTypeToDb(service_type)

  // 추천 예약 생성 (trainer_id는 NULL, 관리자가 나중에 매칭)
  const bookingData = {
    customer_id: customerData.id,
    trainer_id: null, // 추천 예약은 trainer_id가 NULL
    booking_type: BOOKING_TYPE.RECOMMENDED,
    price_multiplier: BOOKING_TYPE_CONFIG.recommended.priceMultiplier,
    booking_date,
    start_time,
    end_time,
    duration_minutes: duration,
    service_type: db_service_type,
    group_size: 1, // 추천 예약은 기본 1:1
    status: 'pending',
    price_per_person: 0, // 매칭 후 설정
    total_price: 0, // 매칭 후 설정
    customer_notes: `${notes}\n\n[요청 정보]\n주소: ${address}\n필요 전문분야: ${specialty_needed}`,
  }

  console.log('[DEBUG] Creating booking with data:', bookingData)

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert(bookingData)
    .select()
    .single()

  if (bookingError) {
    console.error('Booking creation error:', bookingError)
    return {
      error: `예약 생성에 실패했습니다. ${bookingError.message || ''}`,
      details: bookingError
    }
  }

  // 관리자에게 알림 전송 (user_type이 'admin'인 모든 사용자)
  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_type', 'admin')

  if (adminProfiles && adminProfiles.length > 0) {
    console.log('📧 Sending notifications to', adminProfiles.length, 'admin(s)')

    // 모든 관리자에게 알림 전송 (설정 확인 후)
    for (const admin of adminProfiles) {
      // 해당 관리자의 추천 예약 알림 설정 확인
      const isEnabled = await isNotificationEnabled(admin.id, 'recommended_booking_enabled')

      if (isEnabled) {
        const notificationResult = await createNotification({
          userId: admin.id,
          type: 'booking_pending',
          title: '새로운 추천 예약 요청',
          message: `새로운 추천 예약 요청이 접수되었습니다. 트레이너 매칭이 필요합니다.`,
          link: `/admin/bookings/recommended/${booking.id}/match`
        })

        console.log('Admin notification result:', notificationResult)
      } else {
        console.log('Admin notification skipped (disabled):', admin.id)
      }
    }
  }

  revalidatePath('/customer/bookings')

  return { success: true, data: booking }
}
