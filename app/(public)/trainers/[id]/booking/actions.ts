'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { BOOKING_STATUS, PRICING } from '@/lib/constants'
import {
  mapFormServiceTypeToDb,
  calculateTimeRange,
  calculatePricingInfo
} from '@/lib/utils'

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
  const serviceType = formData.get('service_type') as string
  const duration = parseInt(formData.get('duration') as string)
  const customerNotes = formData.get('notes') as string

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

  // Calculate start and end times (utils 사용)
  const [hours, minutes] = time.split(':').map(Number)
  const tempDate = new Date()
  tempDate.setHours(hours, minutes, 0, 0)
  const { start_time: startTime, end_time: endTime } = calculateTimeRange(tempDate, duration)

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

  // Insert booking (constants 사용)
  const { data: booking, error: insertError } = await supabase
    .from('bookings')
    .insert({
      customer_id: customerData.id,
      trainer_id: trainerId,
      service_type: dbServiceType,
      group_size: 1,
      booking_date: date,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: duration,
      price_per_person: pricingInfo.price_per_person,
      total_price: pricingInfo.total_price,
      customer_notes: customerNotes || null,
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

  // Get customer name for notification
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Create notification for trainer
  const customerName = profile?.full_name || '고객'
  const scheduledAt = new Date(`${date}T${startTime}`)
  const notification = notificationTemplates.bookingPending(customerName, scheduledAt)

  if (trainer.profile_id) {
    await createNotification({
      userId: trainer.profile_id,
      ...notification,
      relatedId: booking.id
    })
  }

  // Redirect to customer bookings page with success message
  redirect('/customer/bookings?success=true')
}
