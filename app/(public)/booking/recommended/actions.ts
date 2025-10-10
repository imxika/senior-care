"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { calculateTimeRange } from "@/lib/utils"
import { BOOKING_TYPE, BOOKING_TYPE_CONFIG, PRICING } from "@/lib/constants"
import type { ActionResponse } from "@/lib/types"
import { notifySuitableTrainers } from "@/lib/auto-matching"

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
  const session_type = (formData.get('session_type') as string) || '1:1'
  const service_type = formData.get('service_type') as 'home_visit' | 'center_visit' | 'online'
  const duration = parseInt(formData.get('duration') as string)
  const notes = formData.get('notes') as string || ''
  const specialty_needed = formData.get('specialty_needed') as string || ''

  // Extract address data
  const addressMode = formData.get('address_mode') as string
  const addressId = formData.get('address_id') as string | null
  const newAddress = formData.get('new_address') as string | null
  const newAddressDetail = formData.get('new_address_detail') as string | null
  const newAddressLabel = formData.get('new_address_label') as string | null

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
        error: `고객 정보 생성에 실패했습니다. ${customerError?.message || ''}`
      }
    }
    console.log('[DEBUG] Customer created:', newCustomer)
    customerData = newCustomer
  }

  // 시작/종료 시간 계산
  const booking_date = date
  const booking_datetime = new Date(`${date}T${time}`)
  const { start_time, end_time } = calculateTimeRange(booking_datetime, duration)

  // 세션 타입에 따른 max_participants 설정
  const max_participants = session_type === '1:1' ? 1 : session_type === '2:1' ? 2 : 3

  // Handle address for home visit
  let finalAddressId: string | null = null
  if (service_type === 'home_visit') {
    if (addressMode === 'existing' && addressId) {
      // Use existing address
      finalAddressId = addressId
    } else if (addressMode === 'new' && newAddress) {
      // Create new address and save it
      const { data: savedAddress, error: addressError } = await supabase
        .from('customer_addresses')
        .insert({
          customer_id: customerData.id,
          address: newAddress,
          address_detail: newAddressDetail || null,
          address_label: newAddressLabel || '새 주소',
          is_default: false
        })
        .select('id')
        .single()

      if (addressError) {
        console.error('Address save error:', addressError)
        // Continue without address_id (주소 저장 실패해도 예약은 진행)
      } else {
        finalAddressId = savedAddress.id
      }
    }
  }

  // Build customer notes (remove address from notes since it's in address_id now)
  let customerNotes = notes
  if (specialty_needed) {
    customerNotes += `\n\n[요청 정보]\n필요 전문분야: ${specialty_needed}`
  }

  // 추천 예약 생성 (trainer_id는 NULL, 결제 후 자동 매칭 시작)
  const bookingData = {
    customer_id: customerData.id,
    trainer_id: null, // 추천 예약은 trainer_id가 NULL
    booking_type: BOOKING_TYPE.RECOMMENDED,
    price_multiplier: BOOKING_TYPE_CONFIG.recommended.priceMultiplier,
    booking_date,
    start_time,
    end_time,
    duration_minutes: duration,
    service_type: service_type, // DB 기준 값 직접 사용 (home_visit, center_visit, online)
    session_type,
    max_participants,
    current_participants: 1, // 예약자 본인
    group_size: 1, // 추천 예약은 기본 1:1 (deprecated, session_type 사용)
    status: 'pending_payment', // 🆕 결제 대기 상태로 시작 (결제 완료 후 pending으로 변경)
    matching_status: 'pending', // 매칭은 결제 완료 후 시작
    price_per_person: PRICING.SESSION_PRICES[session_type as keyof typeof PRICING.SESSION_PRICES] || PRICING.SESSION_PRICES['1:1'],
    total_price: PRICING.SESSION_PRICES[session_type as keyof typeof PRICING.SESSION_PRICES] || PRICING.SESSION_PRICES['1:1'],
    customer_notes: customerNotes,
    address_id: finalAddressId,
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
      error: `예약 생성에 실패했습니다. ${bookingError.message || ''}`
    }
  }

  // Primary participant 생성 (예약자 본인)
  const { error: participantError } = await supabase
    .from('booking_participants')
    .insert({
      booking_id: booking.id,
      customer_id: customerData.id,
      payment_amount: 0, // 매칭 후 설정
      payment_status: 'pending',
      is_primary: true,
      attendance_status: 'confirmed',
    })

  if (participantError) {
    console.error('Participant creation error:', participantError)
    // 예약은 생성되었지만 participant 생성 실패 - 일단 진행
    console.warn('[WARN] Booking created but participant creation failed')
  }

  // 🆕 자동 매칭은 결제 완료 후에 실행됨
  // payment completion handler에서 notifySuitableTrainers() 호출
  console.log('📝 [CREATE-BOOKING] Booking created with pending_payment status:', booking.id)
  console.log('⏳ [CREATE-BOOKING] Auto-matching will start after payment completion')

  revalidatePath('/customer/bookings')

  // 예약 생성 후 즉시 결제 페이지로 리다이렉트
  redirect(`/checkout/${booking.id}`)
}
