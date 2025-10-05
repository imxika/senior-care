import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, User, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { BookingProgressTracker } from '@/components/booking-progress-tracker'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CustomerBookingDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 고객 정보 확인
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!customer) {
    redirect('/')
  }

  // 예약 정보 조회
  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_type,
      trainer_matched_at,
      trainer_confirmed_at,
      service_started_at,
      service_completed_at,
      trainer:trainers(
        id,
        hourly_rate,
        profiles!trainers_profile_id_fkey(
          full_name,
          phone,
          email
        )
      )
    `)
    .eq('id', id)
    .eq('customer_id', customer.id)
    .single()

  if (error || !booking) {
    notFound()
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  const formatTime = (time: string) => {
    return time.slice(0, 5) // HH:MM
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: '대기 중', variant: 'secondary' },
      confirmed: { label: '확정', variant: 'default' },
      in_progress: { label: '진행 중', variant: 'default' },
      completed: { label: '완료', variant: 'outline' },
      cancelled: { label: '취소됨', variant: 'destructive' },
      no_show: { label: '노쇼', variant: 'destructive' }
    }

    const { label, variant } = statusMap[status] || { label: status, variant: 'outline' as const }
    return <Badge variant={variant}>{label}</Badge>
  }

  const getServiceTypeLabel = (type: string) => {
    return type === 'home_visit' ? '방문 서비스' : '센터 방문'
  }

  const getBookingTypeLabel = (type: string) => {
    return type === 'recommended' ? '추천 예약' : '지정 예약'
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/customer/bookings">
          <Button variant="ghost" className="mb-4">
            ← 예약 목록으로
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">예약 상세</h1>
      </div>

      <div className="space-y-6">
        {/* 예약 진행 상태 트래커 */}
        <BookingProgressTracker
          bookingType={booking.booking_type || 'direct'}
          currentStatus={booking.status}
          hasTrainer={!!booking.trainer_id}
          createdAt={booking.created_at}
          trainerMatchedAt={booking.trainer_matched_at}
          trainerConfirmedAt={booking.trainer_confirmed_at}
          serviceStartedAt={booking.service_started_at}
          serviceCompletedAt={booking.service_completed_at}
        />

        {/* 예약 상태 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>예약 정보</CardTitle>
              {getStatusBadge(booking.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">예약 일시</p>
                  <p className="font-medium">{formatDate(booking.booking_date)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">시간</p>
                  <p className="font-medium">
                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                    <span className="text-sm text-muted-foreground ml-2">
                      ({booking.duration_minutes}분)
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">서비스 유형</p>
                  <p className="font-medium">{getServiceTypeLabel(booking.service_type)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">예약 타입</p>
                  <p className="font-medium">{getBookingTypeLabel(booking.booking_type)}</p>
                </div>
              </div>
            </div>

            {booking.customer_notes && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">요청사항</p>
                <p className="whitespace-pre-wrap">{booking.customer_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 트레이너 정보 */}
        {booking.trainer ? (
          <Card>
            <CardHeader>
              <CardTitle>배정된 트레이너</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">이름</p>
                    <p className="font-medium text-lg">
                      {booking.trainer.profiles?.full_name || '이름 없음'}
                    </p>
                  </div>
                </div>

                {booking.trainer.profiles?.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">연락처</p>
                    <p className="font-medium">{booking.trainer.profiles.phone}</p>
                  </div>
                )}

                {booking.trainer.profiles?.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">이메일</p>
                    <p className="font-medium">{booking.trainer.profiles.email}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>트레이너 매칭 대기 중</CardTitle>
              <CardDescription>
                관리자가 최적의 트레이너를 매칭하고 있습니다. 매칭이 완료되면 알림을 보내드립니다.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* 가격 정보 */}
        {booking.total_price > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>결제 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">인당 가격</span>
                  <span>{booking.price_per_person.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">인원</span>
                  <span>{booking.group_size}명</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>총 금액</span>
                  <span>{booking.total_price.toLocaleString()}원</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
