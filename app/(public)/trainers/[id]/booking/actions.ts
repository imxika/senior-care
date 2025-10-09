'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { BOOKING_STATUS, PRICING } from '@/lib/constants'
import {
  mapFormServiceTypeToDb,
  calculatePricingInfo
} from '@/lib/utils'
import { formatKSTDate, calculateKSTTimeRange } from '@/lib/date-utils'

export async function createBooking(formData: FormData) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: '로그인이 필요합니다.' }
  }

  // Get or create customer_id from customers table
  let { data: customerData } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  // If customer doesn't exist, create one
  if (!customerData) {
    const { data: newCustomer, error: createError } = await supabase
      .from('customers')
      .insert({
        profile_id: user.id
      })
      .select('id')
      .single()

    if (createError) {
      console.error('Customer creation error:', createError)
      return { error: '고객 정보 생성 중 오류가 발생했습니다.' }
    }

    customerData = newCustomer
  }

  // Extract form data
  const trainerId = formData.get('trainer_id') as string
  const date = formData.get('date') as string
  const time = formData.get('time') as string
  const sessionType = (formData.get('session_type') as string) || '1:1'
  const serviceType = formData.get('service_type') as string
  const duration = parseInt(formData.get('duration') as string)
  const customerNotes = formData.get('notes') as string
  const participantsJson = formData.get('participants') as string | null

  // Extract address data
  const addressMode = formData.get('address_mode') as string
  const addressId = formData.get('address_id') as string | null
  const newAddress = formData.get('new_address') as string | null
  const newAddressDetail = formData.get('new_address_detail') as string | null
  const newAddressLabel = formData.get('new_address_label') as string | null

  // Parse participants data if exists (for group sessions)
  interface AdditionalParticipant {
    customer_id?: string
    guest_name?: string
    guest_phone?: string
    guest_email?: string
    guest_birth_date?: string
    guest_gender?: string
    payment_amount: number
  }

  let additionalParticipants: AdditionalParticipant[] = []
  if (participantsJson) {
    try {
      additionalParticipants = JSON.parse(participantsJson)
    } catch (error) {
      console.error('Failed to parse participants:', error)
    }
  }

  // Validate required fields
  if (!trainerId || !date || !time || !serviceType || !duration) {
    console.error('Missing fields:', { trainerId, date, time, serviceType, duration })
    return { error: '필수 항목을 모두 입력해주세요.' }
  }

  // Validate duration is a number
  if (isNaN(duration)) {
    console.error('Invalid duration:', formData.get('duration'))
    return { error: '예상 시간을 선택해주세요.' }
  }

  // Calculate start and end times in KST
  const { start_time: startTime, end_time: endTime } = calculateKSTTimeRange(time, duration)

  // Get trainer info for notification and pricing
  const { data: trainer } = await supabase
    .from('trainers')
    .select('profile_id, hourly_rate')
    .eq('id', trainerId)
    .single()

  if (!trainer) {
    return { error: '트레이너 정보를 찾을 수 없습니다.' }
  }

  // Calculate pricing (utils 사용)
  const hourlyRate = trainer.hourly_rate || PRICING.DEFAULT_HOURLY_RATE
  const pricingInfo = calculatePricingInfo(hourlyRate, duration)

  // Map service_type from form to DB (utils 사용)
  const dbServiceType = mapFormServiceTypeToDb(serviceType as 'home' | 'center')

  // Calculate max_participants based on session_type
  const maxParticipants = sessionType === '1:1' ? 1 : sessionType === '2:1' ? 2 : 3

  // DEBUG: Log date before and after formatting
  console.log('=== BOOKING DATE DEBUG ===')
  console.log('Original date from form:', date)
  console.log('After formatKSTDate:', formatKSTDate(date))
  console.log('Start time:', startTime)
  console.log('End time:', endTime)

  // Handle address for home visit
  let finalAddressId: string | null = null
  if (serviceType === 'home') {
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

  // Insert booking with KST date handling
  const { data: booking, error: insertError } = await supabase
    .from('bookings')
    .insert({
      customer_id: customerData.id,
      trainer_id: trainerId,
      service_type: dbServiceType,
      session_type: sessionType,
      max_participants: maxParticipants,
      current_participants: 1, // 예약자 본인만
      group_size: 1, // deprecated, session_type 사용
      booking_date: formatKSTDate(date), // Ensure KST date format
      start_time: startTime,
      end_time: endTime,
      duration_minutes: duration,
      price_per_person: pricingInfo.price_per_person,
      total_price: pricingInfo.total_price,
      customer_notes: customerNotes || null,
      address_id: finalAddressId,
      status: BOOKING_STATUS.PENDING
    })
    .select()
    .single()

  if (insertError) {
    console.error('Booking creation error:', insertError)
    console.error('Error details:', {
      message: insertError.message,
      code: insertError.code,
      details: insertError.details,
      hint: insertError.hint
    })
    return { error: `예약 생성 중 오류가 발생했습니다: ${insertError.message}` }
  }

  // Create all participants
  const participantsToCreate = []

  // 1. Primary participant (예약자 본인) - 호스트가 전액 결제
  participantsToCreate.push({
    booking_id: booking.id,
    customer_id: customerData.id,
    payment_amount: pricingInfo.total_price, // 호스트가 전액 선결제
    payment_status: 'pending', // 결제 대기 (나중에 결제 시스템 연동)
    is_primary: true,
    attendance_status: 'confirmed',
  })

  // 2. Additional participants (회원 또는 게스트)
  for (const participant of additionalParticipants) {
    if (participant.customer_id) {
      // 회원 참가자
      participantsToCreate.push({
        booking_id: booking.id,
        customer_id: participant.customer_id,
        payment_amount: participant.payment_amount,
        payment_status: 'pending', // 초대 수락 후 결제
        is_primary: false,
        attendance_status: 'invited', // 초대됨 (수락 대기)
      })
    } else {
      // 게스트 참가자
      participantsToCreate.push({
        booking_id: booking.id,
        guest_name: participant.guest_name,
        guest_phone: participant.guest_phone,
        guest_email: participant.guest_email,
        guest_birth_date: participant.guest_birth_date,
        guest_gender: participant.guest_gender,
        payment_amount: participant.payment_amount,
        payment_status: 'pending',
        is_primary: false,
        attendance_status: 'confirmed', // 게스트는 바로 확정 (초대 시스템 없음)
      })
    }
  }

  // Insert all participants
  const { error: participantError } = await supabase
    .from('booking_participants')
    .insert(participantsToCreate)

  if (participantError) {
    console.error('Participant creation error:', participantError)
    // 예약은 생성되었지만 participant 생성 실패 - 에러 반환
    return { error: `참가자 정보 저장 중 오류가 발생했습니다: ${participantError.message}` }
  }

  // NOTE: Trainer notification will be sent AFTER payment is confirmed
  // See /api/payments/toss/confirm or /api/payments/stripe/confirm for notification logic

  // Redirect to checkout page for payment
  redirect(`/checkout/${booking.id}`)
}
