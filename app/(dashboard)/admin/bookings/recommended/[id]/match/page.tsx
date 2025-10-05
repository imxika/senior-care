import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, FileText } from "lucide-react"
import { formatDate } from "date-fns"
import { ko } from "date-fns/locale"
import { SERVICE_TYPE_LABELS } from "@/lib/constants"
import { TrainerMatchList } from "./trainer-match-list"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function MatchTrainerPage({ params }: PageProps) {
  const supabase = await createClient()
  const { id: bookingId } = await params

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

  // 예약 정보 조회
  const { data: booking, error: bookingError } = await supabase
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
    .eq('id', bookingId)
    .eq('booking_type', 'recommended')
    .single()

  if (bookingError || !booking) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>오류</CardTitle>
            <CardDescription>예약을 찾을 수 없습니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // 트레이너가 이미 매칭된 경우 - 예약 상세 페이지로 리디렉션
  if (booking.trainer_id) {
    redirect(`/admin/bookings/${bookingId}`)
  }

  // 모든 활성 트레이너 조회
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
      is_verified,
      is_active,
      profiles!trainers_profile_id_fkey(
        full_name,
        avatar_url,
        phone,
        email
      )
    `)
    .eq('is_verified', true)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (trainersError) {
    console.error('Error fetching trainers:', trainersError)
  }

  console.log('Trainers query result:', {
    count: trainers?.length || 0,
    trainers: trainers?.map(t => ({
      id: t.id,
      name: t.profiles?.full_name,
      hourly_rate: t.hourly_rate,
      is_verified: t.is_verified,
      is_active: t.is_active
    }))
  })

  console.log('Full trainers data:', trainers)

  // 각 트레이너의 예약 수 조회 (부하 분산용)
  const trainerIds = trainers?.map(t => t.id) || []
  const { data: trainerBookingCounts } = await supabase
    .from('bookings')
    .select('trainer_id')
    .in('trainer_id', trainerIds)
    .in('status', ['pending', 'confirmed']) // 진행 중인 예약만
    .gte('booking_date', new Date().toISOString().split('T')[0]) // 미래 예약만

  // 트레이너별 예약 수 계산
  const bookingCountByTrainer = trainerBookingCounts?.reduce((acc, b) => {
    acc[b.trainer_id] = (acc[b.trainer_id] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  console.log('Trainer booking counts:', bookingCountByTrainer)

  const customerName = booking.customer?.profiles?.full_name || booking.customer?.profiles?.email?.split('@')[0] || '고객'
  const date = new Date(booking.booking_date)

  // 요청사항에서 주소와 전문분야 추출
  const notes = booking.customer_notes || booking.notes || ''
  const addressMatch = notes.match(/주소:\s*([^\n]+)/)
  const specialtyMatch = notes.match(/필요 전문분야:\s*([^\n]+)/)

  const address = addressMatch ? addressMatch[1].trim() : ''
  const specialty = specialtyMatch ? specialtyMatch[1].trim() : ''

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">트레이너 매칭</h1>
        <p className="text-gray-600 mt-2">
          고객의 요청사항에 적합한 트레이너를 선택해주세요.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 예약 정보 (좌측) */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>예약 정보</CardTitle>
              <CardDescription>
                {customerName}님의 추천 예약 요청
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{formatDate(date, 'PPP', { locale: ko })}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>{booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span>{SERVICE_TYPE_LABELS[booking.service_type as keyof typeof SERVICE_TYPE_LABELS]}</span>
                </div>

                {address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <span className="flex-1">{address}</span>
                  </div>
                )}
              </div>

              {specialty && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs font-medium text-blue-900">요청 전문분야</p>
                  <p className="text-sm text-blue-700 mt-1">{specialty}</p>
                </div>
              )}

              {notes && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium">요청사항</p>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                    {notes.split('[요청 정보]')[0].trim()}
                  </p>
                </div>
              )}

              <div className="pt-3 border-t">
                <p className="text-xs text-gray-500">고객 정보</p>
                <p className="text-sm font-medium">{customerName}</p>
                <p className="text-sm text-gray-600">
                  {booking.customer?.profiles?.email}
                </p>
                {booking.customer?.profiles?.phone && (
                  <p className="text-sm text-gray-600">
                    {booking.customer?.profiles?.phone}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 트레이너 목록 (우측) */}
        <div className="lg:col-span-2">
          <TrainerMatchList
            trainers={trainers || []}
            bookingId={bookingId}
            serviceType={booking.service_type}
            specialty={specialty}
            address={address}
            bookingDate={booking.booking_date}
            startTime={booking.start_time}
            endTime={booking.end_time}
            trainerBookingCounts={bookingCountByTrainer}
          />
        </div>
      </div>
    </div>
  )
}
