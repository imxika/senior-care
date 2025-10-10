import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RecommendedBookingCard } from "./recommended-booking-card"

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Supabase query 결과 타입 정의 (foreign key joins return arrays)
interface SupabaseBookingResult {
  id: string
  customer_id: string
  trainer_id: string | null
  booking_type: string
  service_type: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  matching_status: string | null
  total_price: number
  customer_request: string | null
  parking_info: string | null
  created_at: string
  updated_at: string
  customer: Array<{
    id: string
    profile: Array<{
      full_name: string | null
      email: string | null
      phone: string | null
    }>
  }>
}

// RecommendedBookingCard에 전달할 normalized 타입
interface NormalizedBooking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  service_type: string
  customer_notes?: string
  created_at: string
  customer?: {
    profile?: {
      full_name?: string
      email?: string
      phone?: string
    }
  }
}

export default async function AdminRecommendedBookingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Admin 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'admin') {
    redirect("/")
  }

  // Service Role client for RLS bypass (admin access)
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

  // 매칭 대기 중인 추천 예약 목록 조회 (Service Role로 RLS 우회)
  const { data: pendingBookings, error } = await serviceSupabase
    .from('bookings')
    .select(`
      id,
      customer_id,
      trainer_id,
      booking_type,
      service_type,
      booking_date,
      start_time,
      end_time,
      status,
      matching_status,
      total_price,
      customer_request,
      parking_info,
      created_at,
      updated_at,
      customer:customers!customer_id(
        id,
        profile:profiles!profile_id(
          full_name,
          email,
          phone
        )
      )
    `)
    .eq('booking_type', 'recommended')
    .eq('status', 'pending')
    .is('trainer_id', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching recommended bookings:', error)
  }

  // Supabase foreign key joins return arrays - normalize to flat objects
  const rawBookings = (pendingBookings || []) as unknown as SupabaseBookingResult[]
  const bookings: NormalizedBooking[] = rawBookings.map((booking) => {
    const customerData = Array.isArray(booking.customer) ? booking.customer[0] : undefined
    const profileData = customerData?.profile ? (Array.isArray(customerData.profile) ? customerData.profile[0] : customerData.profile) : undefined

    return {
      id: booking.id,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      service_type: booking.service_type,
      customer_notes: booking.customer_request || undefined,
      created_at: booking.created_at,
      customer: profileData ? {
        profile: {
          full_name: profileData.full_name || undefined,
          email: profileData.email || undefined,
          phone: profileData.phone || undefined
        }
      } : undefined
    }
  })

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">추천 예약 매칭</h1>
        <p className="text-gray-600 mt-2">
          고객의 요청사항을 확인하고 최적의 트레이너를 매칭해주세요.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>대기 중</CardDescription>
            <CardTitle className="text-3xl">{bookings.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">
              매칭 대기 중인 추천 예약이 없습니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <RecommendedBookingCard
              key={booking.id}
              booking={booking}
            />
          ))}
        </div>
      )}
    </div>
  )
}
