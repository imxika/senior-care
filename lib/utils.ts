import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { SERVICE_TYPES, BOOKING_TYPE_CONFIG, CANCELLATION_POLICY, type ServiceType, type BookingType } from './constants'
import type { DateTimeInfo, PricingInfo } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ====================================
// 날짜/시간 유틸리티
// ====================================

/**
 * booking_date와 start_time을 조합하여 Date 객체 생성
 * @param booking_date - YYYY-MM-DD 형식
 * @param start_time - HH:MM:SS 형식
 */
export function combineDateTime(booking_date: string, start_time: string): Date {
  return new Date(`${booking_date}T${start_time}`)
}

/**
 * Date 객체에서 시작/종료 시간 문자열 생성
 * @param date - 기준 날짜
 * @param durationMinutes - 소요 시간 (분)
 */
export function calculateTimeRange(date: Date, durationMinutes: number): {
  start_time: string
  end_time: string
} {
  const hours = date.getHours()
  const minutes = date.getMinutes()

  const startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`

  const endDate = new Date(date.getTime() + durationMinutes * 60 * 1000)
  const endHours = endDate.getHours()
  const endMinutes = endDate.getMinutes()
  const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`

  return { start_time: startTime, end_time: endTime }
}

/**
 * 현재 시간으로부터 예약까지 남은 시간 (시간 단위)
 */
export function getHoursUntilBooking(dateTime: DateTimeInfo): number {
  const scheduledTime = combineDateTime(dateTime.booking_date, dateTime.start_time)
  const now = new Date()
  return (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60)
}

/**
 * 예약이 과거인지 확인
 */
export function isBookingPast(dateTime: DateTimeInfo): boolean {
  const scheduledTime = combineDateTime(dateTime.booking_date, dateTime.start_time)
  return scheduledTime < new Date()
}

/**
 * 취소 가능 여부 확인
 * @returns { canCancel: boolean, hoursUntil: number }
 */
export function canCancelBooking(dateTime: DateTimeInfo): {
  canCancel: boolean
  hoursUntil: number
} {
  const hoursUntil = getHoursUntilBooking(dateTime)
  const canCancel = hoursUntil >= CANCELLATION_POLICY.MIN_CANCELLATION_HOURS
  return { canCancel, hoursUntil }
}

/**
 * 취소 수수료 계산
 * @param totalPrice - 총 결제 금액
 * @param booking_date - 예약 날짜 (YYYY-MM-DD)
 * @param start_time - 시작 시간 (HH:MM:SS)
 * @returns { feeRate: number, feeAmount: number, refundAmount: number, timeCategory: string }
 */
export function calculateCancellationFee(
  totalPrice: number,
  booking_date: string,
  start_time: string
): {
  feeRate: number
  feeAmount: number
  refundAmount: number
  timeCategory: string
} {
  const scheduledTime = combineDateTime(booking_date, start_time)
  const now = new Date()
  const hoursUntil = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  const daysUntil = hoursUntil / 24

  let feeRate: number
  let timeCategory: string

  if (daysUntil >= 7) {
    feeRate = CANCELLATION_POLICY.FEES.DAYS_7_PLUS
    timeCategory = '7일 이상 전'
  } else if (daysUntil >= 3) {
    feeRate = CANCELLATION_POLICY.FEES.DAYS_3_TO_7
    timeCategory = '3-7일 전'
  } else if (daysUntil >= 1) {
    feeRate = CANCELLATION_POLICY.FEES.DAYS_1_TO_3
    timeCategory = '1-3일 전'
  } else {
    feeRate = CANCELLATION_POLICY.FEES.HOURS_24
    timeCategory = '24시간 이내'
  }

  const feeAmount = Math.round(totalPrice * feeRate)
  const refundAmount = totalPrice - feeAmount

  return {
    feeRate,
    feeAmount,
    refundAmount,
    timeCategory
  }
}

// ====================================
// 서비스 타입 유틸리티
// ====================================

/**
 * 폼 값('home'/'center')을 DB 값('home_visit'/'center_visit')으로 변환
 */
export function mapFormServiceTypeToDb(formValue: 'home' | 'center'): ServiceType {
  return formValue === 'home' ? SERVICE_TYPES.HOME_VISIT : SERVICE_TYPES.CENTER_VISIT
}

/**
 * DB 값('home_visit'/'center_visit')을 폼 값('home'/'center')으로 변환
 */
export function mapDbServiceTypeToForm(dbValue: ServiceType): 'home' | 'center' {
  return dbValue === SERVICE_TYPES.HOME_VISIT ? 'home' : 'center'
}

// ====================================
// 가격 계산 유틸리티
// ====================================

/**
 * 총 가격 계산
 * @param hourlyRate - 시간당 요금
 * @param durationMinutes - 소요 시간 (분)
 */
export function calculateTotalPrice(hourlyRate: number, durationMinutes: number): number {
  const durationHours = durationMinutes / 60
  return hourlyRate * durationHours
}

/**
 * 플랫폼 수수료 계산
 * @param totalPrice - 총 가격
 * @param feePercent - 수수료 비율 (%)
 */
export function calculatePlatformFee(totalPrice: number, feePercent: number): number {
  return Math.round(totalPrice * (feePercent / 100))
}

/**
 * 예약 타입별 가격 배수 조회
 */
export function getPriceMultiplier(bookingType: BookingType): number {
  return BOOKING_TYPE_CONFIG[bookingType].priceMultiplier
}

/**
 * 가격 정보 계산 (예약 타입 포함)
 */
export function calculatePricingInfo(
  hourlyRate: number,
  durationMinutes: number,
  bookingType: BookingType = 'recommended',
  platformFeePercent?: number
): PricingInfo {
  const price_multiplier = getPriceMultiplier(bookingType)
  const base_price = calculateTotalPrice(hourlyRate, durationMinutes)
  const total_price = Math.round(base_price * price_multiplier)
  const price_per_person = Math.round(hourlyRate * price_multiplier)
  const platform_fee = platformFeePercent
    ? calculatePlatformFee(total_price, platformFeePercent)
    : undefined

  return {
    hourly_rate: hourlyRate,
    duration_minutes: durationMinutes,
    booking_type: bookingType,
    price_multiplier,
    base_price,
    price_per_person,
    total_price,
    platform_fee
  }
}

// ====================================
// 포맷팅 유틸리티
// ====================================

/**
 * 금액을 한국어 형식으로 포맷 (예: 50,000원)
 */
export function formatPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '미정'
  }
  return `${amount.toLocaleString('ko-KR')}원`
}

/**
 * 날짜를 한국어 형식으로 포맷
 */
export function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }
  return date.toLocaleDateString('ko-KR', options || defaultOptions)
}

/**
 * 시간을 한국어 형식으로 포맷
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
