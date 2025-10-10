// ====================================
// 시니어케어 플랫폼 타입 정의
// ====================================

import { Database } from './database.types'
import type {
  UserRole,
  ServiceType,
  BookingStatus,
  BookingType,
  MobilityLevel,
  Gender
} from './constants'

// ====================================
// Database 타입 별칭
// ====================================
type Tables = Database['public']['Tables']

export type Profile = Tables['profiles']['Row']
export type Customer = Tables['customers']['Row']
export type Trainer = Tables['trainers']['Row']
export type Program = Tables['programs']['Row']
export type Booking = Tables['bookings']['Row']
export type Review = Tables['reviews']['Row']
export type BasePayment = Tables['payments']['Row']
export type Notification = Tables['notifications']['Row']

// Payment 타입 확장 (payment_provider 필드 추가)
export type Payment = BasePayment & {
  payment_provider?: 'stripe' | 'toss'
}

// ====================================
// 확장된 타입 (Join된 데이터)
// ====================================

/**
 * 프로필 정보가 포함된 트레이너
 */
export interface TrainerWithProfile extends Trainer {
  profiles: Pick<Profile, 'full_name' | 'avatar_url' | 'phone'> | null
}

/**
 * 프로필 정보가 포함된 고객
 */
export interface CustomerWithProfile extends Customer {
  profiles: Pick<Profile, 'full_name' | 'avatar_url' | 'phone'> | null
}

/**
 * 트레이너와 고객 정보가 모두 포함된 예약
 */
export interface BookingWithDetails extends Booking {
  customer: {
    id: string
    profiles: Pick<Profile, 'full_name' | 'avatar_url' | 'email' | 'phone'> | null
  } | null
  trainer: {
    id: string
    profile_id: string
    profiles: Pick<Profile, 'full_name' | 'avatar_url' | 'email' | 'phone'> | null
  } | null
}

/**
 * Sanity CMS 프로필 정보
 */
export interface SanityTrainerProfile {
  supabaseId: string
  profileImage?: {
    asset?: {
      url: string
    }
  }
  shortBio?: string
  specializations?: string[]
  featured?: boolean
}

/**
 * Sanity 데이터가 포함된 트레이너
 */
export interface TrainerWithSanity extends TrainerWithProfile {
  sanity?: SanityTrainerProfile
}

// ====================================
// API 응답 타입
// ====================================

/**
 * API 에러 응답
 */
export interface ApiErrorResponse {
  error: string
  details?: string | Record<string, unknown>
  code?: string
}

/**
 * Supabase 쿼리 에러 타입
 */
export interface SupabaseError {
  message: string
  details?: string
  hint?: string
  code?: string
}

// ====================================
// 폼 데이터 타입
// ====================================

/**
 * 예약 생성 폼 데이터
 */
export interface CreateBookingFormData {
  booking_type: BookingType        // 예약 타입 추가
  trainer_id?: string               // 추천 예약의 경우 선택사항
  date: string
  time: string
  service_type: 'home' | 'center'  // Form value
  duration: number
  notes?: string
}

/**
 * 고객 프로필 업데이트 폼 데이터
 */
export interface UpdateCustomerProfileFormData {
  // Profile fields
  full_name: string
  phone: string

  // Customer fields
  age?: number
  gender?: Gender
  address?: string
  address_detail?: string
  emergency_contact?: string
  emergency_phone?: string
  mobility_level?: MobilityLevel
  notes?: string
}

/**
 * 트레이너 프로필 업데이트 폼 데이터
 */
export interface UpdateTrainerProfileFormData {
  // Profile fields
  full_name: string
  phone: string

  // Trainer fields
  years_experience?: number
  certifications?: string[]
  specialties?: string[]
  bio?: string
  hourly_rate?: number
  home_visit_available?: boolean
  center_visit_available?: boolean
  service_areas?: string[]
}

// ====================================
// API 응답 타입
// ====================================

/**
 * 서버 액션 성공 응답
 */
export interface SuccessResponse<T = void> {
  success: true
  data?: T
}

/**
 * 서버 액션 에러 응답
 */
export interface ErrorResponse {
  error: string
  code?: string
}

/**
 * 서버 액션 응답 (성공 또는 에러)
 */
export type ActionResponse<T = void> = SuccessResponse<T> | ErrorResponse

// ====================================
// 유틸리티 타입
// ====================================

/**
 * 날짜/시간 조합
 */
export interface DateTimeInfo {
  booking_date: string
  start_time: string
  end_time?: string
}

/**
 * 가격 계산 정보
 */
export interface PricingInfo {
  hourly_rate: number
  duration_minutes: number
  booking_type: BookingType         // 예약 타입 추가
  price_multiplier: number          // 가격 배수 (direct: 1.3, recommended: 1.0)
  base_price: number                // 기본 가격
  price_per_person: number          // 최종 인당 가격
  total_price: number
  platform_fee?: number
}

/**
 * 예약 가능 여부 체크 결과
 */
export interface BookingAvailability {
  available: boolean
  reason?: string
  conflicting_booking_id?: string
}
