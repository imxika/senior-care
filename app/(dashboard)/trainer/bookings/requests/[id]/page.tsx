import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AcceptBookingButton, RejectBookingButton } from './BookingActionButtons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, User, FileText } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TrainerBookingRequestPage({ params }: PageProps) {
  const { id: bookingId } = await params
  const supabase = await createClient()

  // 1. 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // 2. 트레이너 확인
  const { data: trainer, error: trainerError } = await supabase
    .from('trainers')
    .select('id, profile_id')
    .eq('profile_id', user.id)
    .single()

  if (trainerError || !trainer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-destructive">트레이너 정보를 찾을 수 없습니다.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 3. 예약 정보 가져오기
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_type,
      service_type,
      session_type,
      duration_minutes,
      booking_date,
      start_time,
      end_time,
      total_price,
      price_per_person,
      max_participants,
      status,
      customer_notes,
      pending_trainer_ids,
      trainer_id,
      auto_match_deadline,
      customer:customers!bookings_customer_id_fkey(
        id,
        profile:profiles!customers_profile_id_fkey(
          id,
          full_name,
          phone
        )
      ),
      address:customer_addresses!bookings_address_id_fkey(
        address,
        address_detail,
        address_label
      )
    `)
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-destructive">예약을 찾을 수 없습니다.</p>
            <div className="text-center mt-4">
              <Link href="/trainer/dashboard">
                <Button variant="outline">대시보드로 돌아가기</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 4. 이 트레이너가 이 예약의 대기 목록에 있는지 확인
  const pendingTrainerIds = booking.pending_trainer_ids as string[] | null
  const isInPendingList = pendingTrainerIds?.includes(trainer.id) ?? false

  // 5. 이미 다른 트레이너가 수락했는지 확인
  const isAlreadyMatched = booking.trainer_id !== null

  // 6. 상태 확인
  const isValidStatus = booking.status === 'pending' || booking.status === 'pending_payment'

  // 7. 고객 정보
  const customerData = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer
  const customerProfile = customerData?.profile
    ? (Array.isArray(customerData.profile) ? customerData.profile[0] : customerData.profile)
    : null
  const customerName = customerProfile?.full_name || '고객'
  const customerPhone = customerProfile?.phone || ''

  // 8. 주소 정보
  const addressData = Array.isArray(booking.address) ? booking.address[0] : booking.address
  const fullAddress = addressData
    ? `${addressData.address} ${addressData.address_detail || ''}`.trim()
    : ''

  // 9. 날짜/시간 포맷
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const weekday = weekdays[date.getDay()]
    return `${year}년 ${month}월 ${day}일 (${weekday})`
  }

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5)
  }

  // 10. 서비스/세션 타입 라벨
  const getServiceTypeLabel = (serviceType: string) => {
    switch (serviceType) {
      case 'home_visit': return '방문 서비스'
      case 'center_visit': return '센터 방문'
      case 'online': return '온라인'
      default: return serviceType
    }
  }

  const getSessionTypeLabel = (sessionType: string | null) => {
    if (!sessionType) return ''
    switch (sessionType) {
      case '1:1': return '1:1 프리미엄'
      case '2:1': return '2:1 듀얼'
      case '3:1': return '3:1 그룹'
      default: return sessionType
    }
  }

  // 11. 마감 시간
  const deadline = booking.auto_match_deadline
    ? new Date(booking.auto_match_deadline)
    : null
  const isExpired = deadline ? deadline < new Date() : false

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 헤더 */}
      <div className="mb-6">
        <Link href="/trainer/dashboard">
          <Button variant="ghost" className="mb-4">← 대시보드로 돌아가기</Button>
        </Link>
        <h1 className="text-3xl font-bold">예약 요청 상세</h1>
        <p className="text-muted-foreground mt-2">고객의 예약 요청을 검토하고 승인하세요</p>
      </div>

      {/* 상태 알림 */}
      {!isInPendingList && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="py-4">
            <p className="text-orange-800">⚠️ 이 예약 요청은 회원님에게 배정되지 않았습니다.</p>
          </CardContent>
        </Card>
      )}

      {isAlreadyMatched && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <p className="text-blue-800">ℹ️ 이미 다른 트레이너가 이 예약을 수락했습니다.</p>
          </CardContent>
        </Card>
      )}

      {isExpired && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-red-800">⏰ 이 예약 요청은 마감되었습니다.</p>
          </CardContent>
        </Card>
      )}

      {/* 예약 정보 카드 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>예약 정보</CardTitle>
            <Badge variant={isValidStatus ? 'default' : 'secondary'}>
              {booking.status === 'pending_payment' ? '결제 완료' : '대기중'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 고객 정보 */}
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">고객 정보</p>
              <p className="text-sm text-muted-foreground">{customerName}</p>
              {customerPhone && (
                <p className="text-sm text-muted-foreground">{customerPhone}</p>
              )}
            </div>
          </div>

          {/* 날짜/시간 */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">예약 일시</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(booking.booking_date)}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                {booking.duration_minutes && ` (${booking.duration_minutes}분)`}
              </p>
            </div>
          </div>

          {/* 서비스 정보 */}
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">서비스 정보</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{getServiceTypeLabel(booking.service_type)}</Badge>
                {booking.session_type && (
                  <Badge variant="outline">{getSessionTypeLabel(booking.session_type)}</Badge>
                )}
                {booking.max_participants && (
                  <Badge variant="outline">최대 {booking.max_participants}명</Badge>
                )}
              </div>
            </div>
          </div>

          {/* 주소 (방문 서비스인 경우) */}
          {booking.service_type === 'home_visit' && fullAddress && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">방문 주소</p>
                <p className="text-sm text-muted-foreground">{fullAddress}</p>
              </div>
            </div>
          )}

          {/* 요청사항 */}
          {booking.customer_notes && (
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">고객 요청사항</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                  {booking.customer_notes}
                </p>
              </div>
            </div>
          )}

          {/* 가격 */}
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-lg">총 금액</span>
              <span className="text-2xl font-bold text-primary">
                {booking.total_price.toLocaleString()}원
              </span>
            </div>
            {booking.session_type && booking.session_type !== '1:1' && (
              <p className="text-sm text-muted-foreground mt-1">
                1인당 {booking.price_per_person.toLocaleString()}원
              </p>
            )}
          </div>

          {/* 마감 시간 */}
          {deadline && !isExpired && (
            <div className="flex items-start gap-3 border-t pt-4">
              <Clock className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-orange-700">선착순 마감</p>
                <p className="text-sm text-muted-foreground">
                  {deadline.toLocaleString('ko-KR')} 까지
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 액션 버튼 */}
      {isInPendingList && !isAlreadyMatched && !isExpired && isValidStatus && (
        <Card>
          <CardHeader>
            <CardTitle>예약 응답</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <AcceptBookingButton bookingId={booking.id} trainerId={trainer.id} />
              <RejectBookingButton bookingId={booking.id} trainerId={trainer.id} />
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              ℹ️ 승인하시면 이 예약이 회원님에게 배정되며, 다른 트레이너에게는 마감 알림이 발송됩니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
