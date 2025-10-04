// Supabase Query Helper Functions
import { createClient } from '@/lib/supabase/client'
import { createClient as createSanityClient } from '@sanity/client'
import { Database } from '@/lib/database.types'

const sanityClient = createSanityClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

type Tables = Database['public']['Tables']
type Trainer = Tables['trainers']['Row']
type Program = Tables['programs']['Row']
type Booking = Tables['bookings']['Row']
type Review = Tables['reviews']['Row']

// ====================================
// Trainer Queries
// ====================================

/**
 * 활성화되고 검증된 트레이너 목록 가져오기 (Sanity 데이터 포함)
 */
export async function getVerifiedTrainers() {
  console.log('🔍 getVerifiedTrainers: Starting query...')
  const supabase = createClient()
  console.log('🔍 getVerifiedTrainers: Supabase client created')

  try {
    console.log('🔍 getVerifiedTrainers: Fetching from database...')
    const { data, error } = await supabase
      .from('trainers')
      .select(`
        *,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .eq('is_verified', true)
      .eq('is_active', true)
      .order('rating', { ascending: false })

    console.log('🔍 getVerifiedTrainers: Query completed')
    console.log('🔍 Data received:', data?.length || 0, 'trainers')
    console.log('🔍 Error:', error)

    if (error) {
      console.error('❌ Supabase error details:', error)
      console.error('❌ Error code:', error.code)
      console.error('❌ Error message:', error.message)
      console.error('❌ Error hint:', error.hint)
      console.error('❌ Error details:', error.details)
      // 에러가 있어도 빈 배열 반환 (무한 로딩 방지)
      return []
    }

    // Sanity에서 추가 프로필 정보 가져오기
    try {
      const trainerIds = data?.map(t => t.id) || []
      const sanityProfiles = await sanityClient.fetch(
        `*[_type == "trainerProfile" && supabaseId in $ids && isActive == true]{
          supabaseId,
          profileImage{
            asset->{
              url
            }
          },
          shortBio,
          specializations,
          featured
        }`,
        { ids: trainerIds }
      )

      // Supabase와 Sanity 데이터 병합
      const enrichedTrainers = data?.map(trainer => {
        const sanityProfile = sanityProfiles?.find(
          (profile: any) => profile.supabaseId === trainer.id
        )
        return {
          ...trainer,
          sanity: sanityProfile
        }
      })

      console.log('✅ Returning enriched trainers:', enrichedTrainers?.length || 0)
      return enrichedTrainers || []
    } catch (sanityError) {
      console.warn('⚠️ Sanity fetch failed, returning Supabase data only:', sanityError)
      return data || []
    }
  } catch (err) {
    console.error('❌ Unexpected error in getVerifiedTrainers:', err)
    console.error('❌ Error type:', typeof err)
    console.error('❌ Error string:', String(err))
    // 예외가 발생해도 빈 배열 반환
    return []
  }
}

/**
 * 방문 가능한 트레이너 필터링
 */
export async function getTrainersByServiceType(
  serviceType: 'home_visit' | 'center_visit'
) {
  const supabase = createClient()

  const field = serviceType === 'home_visit'
    ? 'home_visit_available'
    : 'center_visit_available'

  const { data, error } = await supabase
    .from('trainers')
    .select(`
      *,
      profiles!trainers_profile_id_fkey (
        full_name,
        avatar_url,
        phone
      )
    `)
    .eq('is_verified', true)
    .eq('is_active', true)
    .eq(field, true)
    .order('rating', { ascending: false })

  if (error) throw error
  return data
}

/**
 * 특정 지역 서비스 가능한 트레이너
 */
export async function getTrainersByArea(area: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('trainers')
    .select(`
      *,
      profiles!trainers_profile_id_fkey (
        full_name,
        avatar_url
      )
    `)
    .eq('is_verified', true)
    .eq('is_active', true)
    .contains('service_areas', [area])
    .order('rating', { ascending: false })

  if (error) throw error
  return data
}

/**
 * 트레이너 상세 정보 가져오기
 */
export async function getTrainerById(trainerId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('trainers')
    .select(`
      *,
      profiles!trainers_profile_id_fkey (
        full_name,
        avatar_url,
        phone
      ),
      programs (
        *
      )
    `)
    .eq('id', trainerId)
    .single()

  if (error) throw error
  return data
}

// ====================================
// Program Queries
// ====================================

/**
 * 활성 프로그램 목록
 */
export async function getActivePrograms() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('programs')
    .select(`
      *,
      trainers:trainer_id (
        id,
        profiles!trainers_profile_id_fkey (
          full_name,
          avatar_url
        )
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * 특정 트레이너의 프로그램
 */
export async function getProgramsByTrainer(trainerId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('trainer_id', trainerId)
    .eq('is_active', true)

  if (error) throw error
  return data
}

/**
 * 서비스 타입별 프로그램 필터링
 */
export async function getProgramsByServiceType(
  serviceType: 'home_visit' | 'center_visit' | 'both'
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('programs')
    .select(`
      *,
      trainers:trainer_id (
        id,
        profiles!trainers_profile_id_fkey (
          full_name,
          avatar_url
        )
      )
    `)
    .eq('is_active', true)
    .or(`service_type.eq.${serviceType},service_type.eq.both`)

  if (error) throw error
  return data
}

// ====================================
// Booking Queries
// ====================================

/**
 * 고객의 예약 목록
 */
export async function getCustomerBookings(customerId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      trainers:trainer_id (
        id,
        profiles!trainers_profile_id_fkey (
          full_name,
          avatar_url,
          phone
        )
      ),
      programs:program_id (
        title,
        description
      )
    `)
    .eq('customer_id', customerId)
    .order('booking_date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * 트레이너의 예약 목록
 */
export async function getTrainerBookings(trainerId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customers:customer_id (
        id,
        profiles!customers_profile_id_fkey (
          full_name,
          phone
        )
      ),
      programs:program_id (
        title
      )
    `)
    .eq('trainer_id', trainerId)
    .order('booking_date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * 예약 생성
 */
export async function createBooking(booking: Tables['bookings']['Insert']) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bookings')
    .insert(booking)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 예약 상태 업데이트
 */
export async function updateBookingStatus(
  bookingId: string,
  status: Tables['bookings']['Row']['status']
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 예약 취소
 */
export async function cancelBooking(
  bookingId: string,
  cancelledBy: string,
  reason?: string
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_by: cancelledBy,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason
    })
    .eq('id', bookingId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ====================================
// Review Queries
// ====================================

/**
 * 트레이너 리뷰 목록
 */
export async function getTrainerReviews(trainerId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      customers:customer_id (
        profiles!customers_profile_id_fkey (
          full_name,
          avatar_url
        )
      )
    `)
    .eq('trainer_id', trainerId)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * 리뷰 생성
 */
export async function createReview(review: Tables['reviews']['Insert']) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('reviews')
    .insert(review)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 트레이너 응답 추가
 */
export async function addTrainerResponse(
  reviewId: string,
  response: string
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('reviews')
    .update({
      trainer_response: response,
      trainer_response_at: new Date().toISOString()
    })
    .eq('id', reviewId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ====================================
// Profile & Customer Queries
// ====================================

/**
 * 프로필 생성/업데이트
 */
export async function upsertProfile(profile: Tables['profiles']['Insert']) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 고객 정보 생성/업데이트
 */
export async function upsertCustomer(customer: Tables['customers']['Insert']) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('customers')
    .upsert(customer)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 현재 사용자 프로필 가져오기
 */
export async function getCurrentUserProfile() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}

/**
 * 현재 사용자 고객 정보 가져오기
 */
export async function getCurrentCustomer() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      profiles!customers_profile_id_fkey (*)
    `)
    .eq('profile_id', user.id)
    .single()

  if (error) throw error
  return data
}

// ====================================
// Notification Queries
// ====================================

/**
 * 사용자 알림 가져오기
 */
export async function getUserNotifications(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error
  return data
}

/**
 * 읽지 않은 알림 수
 */
export async function getUnreadNotificationCount(userId: string) {
  const supabase = createClient()

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) throw error
  return count || 0
}

/**
 * 알림 읽음 표시
 */
export async function markNotificationAsRead(notificationId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId)
    .select()
    .single()

  if (error) throw error
  return data
}
