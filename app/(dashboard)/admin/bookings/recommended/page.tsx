import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RecommendedBookingCard } from "./recommended-booking-card"

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

  // 매칭 대기 중인 추천 예약 목록 조회
  const { data: pendingBookings, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:customers!bookings_customer_id_fkey(
        id,
        profiles!customers_profile_id_fkey(
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

  const bookings = pendingBookings || []

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
