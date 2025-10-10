import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, User, DollarSign, Phone, Mail, Star } from 'lucide-react'
import Link from 'next/link'
import { BookingActions } from './booking-actions'
import { TrainerNotesForm } from './trainer-notes-form'
import { TrainerReviewResponse } from '@/components/trainer-review-response'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TrainerBookingDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 트레이너 정보 확인
  const { data: trainer } = await supabase
    .from('trainers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!trainer) {
    redirect('/')
  }

  // RLS를 우회하기 위해 Service Role 사용 (고객 정보 조회용)
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

  // 예약 정보 조회 (결제 정보 포함)
  const { data: booking, error } = await serviceSupabase
    .from('bookings')
    .select(`
      *,
      customer:customers!customer_id(
        id,
        age,
        gender,
        address,
        address_detail,
        emergency_contact,
        emergency_phone,
        medical_conditions,
        mobility_level,
        profile:profiles!profile_id(
          full_name,
          phone,
          email
        )
      ),
      booking_address:customer_addresses!address_id(
        id,
        address,
        address_detail,
        address_label
      ),
      payments(
        id,
        payment_status
      )
    `)
    .eq('id', id)
    .eq('trainer_id', trainer.id)
    .single()

  if (error || !booking) {
    console.error('Booking fetch error:', error)
    notFound()
  }

  // Debug: Check full booking data structure
  console.log('Full booking data:', JSON.stringify(booking, null, 2))
  console.log('Customer ID:', booking.customer_id)
  console.log('Booking customer data:', JSON.stringify(booking.customer, null, 2))

  // 리뷰 정보 조회 (완료된 예약만)
  let review = null
  if (booking.status === 'completed') {
    const { data: reviewData } = await supabase
      .from('reviews')
      .select('*')
      .eq('booking_id', id)
      .single()

    review = reviewData
  }

  const formatDate = (date: string) => {
    // KST timezone interpretation
    const d = new Date(date + 'T00:00:00+09:00')
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const day = d.getDate()
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
    return `${year}년 ${month}월 ${day}일 (${weekday})`
  }

  const formatTime = (time: string) => {
    return time.substring(0, 5) // HH:MM
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

  const getSessionTypeLabel = (type: string) => {
    return type === '1:1' ? '1:1 개인 세션' : type === '2:1' ? '2:1 소그룹 (2명)' : '3:1 소그룹 (3명)'
  }

  const getMobilityLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      independent: '독립적',
      assisted: '보조 필요',
      wheelchair: '휠체어',
      bedridden: '와상'
    }
    return labels[level] || level
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="mb-4 md:mb-6">
        <Link href="/trainer/bookings">
          <Button variant="ghost" className="mb-2 md:mb-4 h-11">
            ← 예약 목록으로
          </Button>
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold">예약 상세</h1>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* 예약 상태 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg md:text-xl">예약 정보</CardTitle>
              {getStatusBadge(booking.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">예약 일시</p>
                  <p className="font-medium">{formatDate(booking.booking_date)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
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
                <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">서비스 유형</p>
                  <p className="font-medium">{getServiceTypeLabel(booking.service_type)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">예약 타입</p>
                  <p className="font-medium">{getBookingTypeLabel(booking.booking_type)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">세션 유형</p>
                  <p className="font-medium">{getSessionTypeLabel(booking.session_type)}</p>
                </div>
              </div>

              {booking.group_size > 1 && (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">참가 인원</p>
                    <p className="font-medium">{booking.group_size}명</p>
                  </div>
                </div>
              )}

              {booking.service_type === 'home_visit' && (
                <div className="flex items-start gap-3 md:col-span-2">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">방문 주소</p>
                    {booking.booking_address ? (
                      <>
                        {booking.booking_address.address_label && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded mr-2">
                            {booking.booking_address.address_label}
                          </span>
                        )}
                        <p className="font-medium">{booking.booking_address.address}</p>
                        {booking.booking_address.address_detail && (
                          <p className="text-sm text-muted-foreground">{booking.booking_address.address_detail}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-medium">{booking.customer?.address || '주소 정보 없음'}</p>
                        {booking.customer?.address_detail && (
                          <p className="text-sm text-muted-foreground">{booking.customer.address_detail}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {booking.customer_notes && booking.customer_notes.split('[요청 정보]')[0].trim() && (
              <div className="pt-3 md:pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">고객 요청사항</p>
                <p className="text-sm md:text-base whitespace-pre-wrap">{booking.customer_notes.split('[요청 정보]')[0].trim()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 고객 정보 */}
        {booking.customer && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">고객 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-4">
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">이름</p>
                      <p className="font-medium text-base md:text-lg">
                        {booking.customer.profile?.full_name || '이름 없음'}
                      </p>
                    </div>
                  </div>

                  {booking.customer.age && (
                    <div>
                      <p className="text-sm text-muted-foreground">나이</p>
                      <p className="font-medium">{booking.customer.age}세</p>
                    </div>
                  )}

                  {booking.customer.gender && (
                    <div>
                      <p className="text-sm text-muted-foreground">성별</p>
                      <p className="font-medium">
                        {booking.customer.gender === 'male' ? '남성' : booking.customer.gender === 'female' ? '여성' : '기타'}
                      </p>
                    </div>
                  )}

                  {booking.customer.mobility_level && (
                    <div>
                      <p className="text-sm text-muted-foreground">이동성</p>
                      <p className="font-medium">{getMobilityLevelLabel(booking.customer.mobility_level)}</p>
                    </div>
                  )}
                </div>

                {/* 연락처 */}
                <div className="pt-3 md:pt-4 border-t space-y-2">
                  {booking.customer.profile?.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">연락처</p>
                        <p className="font-medium text-sm md:text-base">{booking.customer.profile.phone}</p>
                      </div>
                    </div>
                  )}

                  {booking.customer.profile?.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">이메일</p>
                        <p className="font-medium text-sm md:text-base break-all">{booking.customer.profile.email}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 주소 */}
                {booking.service_type === 'home_visit' && booking.customer.address && (
                  <div className="pt-3 md:pt-4 border-t">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">방문 주소</p>
                        <p className="font-medium text-sm md:text-base">{booking.customer.address}</p>
                        {booking.customer.address_detail && (
                          <p className="text-sm text-muted-foreground">{booking.customer.address_detail}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 비상 연락처 */}
                {booking.customer.emergency_contact && (
                  <div className="pt-3 md:pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">비상 연락처</p>
                    <div className="space-y-1">
                      <p className="font-medium text-sm md:text-base">{booking.customer.emergency_contact}</p>
                      {booking.customer.emergency_phone && (
                        <p className="text-sm text-muted-foreground">{booking.customer.emergency_phone}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 의료 정보 */}
                {booking.customer.medical_conditions && booking.customer.medical_conditions.length > 0 && (
                  <div className="pt-3 md:pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">의료 정보</p>
                    <div className="flex flex-wrap gap-2">
                      {booking.customer.medical_conditions.map((condition: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs md:text-sm">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 가격 정보 */}
        {booking.total_price > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">결제 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {booking.group_size > 1 && (
                  <div className="flex justify-between text-sm md:text-base">
                    <span className="text-muted-foreground">인당 가격</span>
                    <span className="font-medium">{booking.price_per_person.toLocaleString()}원</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base md:text-lg pt-2 border-t">
                  <span>총 금액</span>
                  <span>{booking.total_price.toLocaleString()}원</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 예약 액션 버튼 */}
        {(booking.status === 'pending' || booking.status === 'confirmed') && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">예약 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <BookingActions
                bookingId={booking.id}
                status={booking.status}
                adminMatchedAt={booking.admin_matched_at}
                payments={booking.payments}
              />
            </CardContent>
          </Card>
        )}

        {/* 트레이너 메모 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">트레이너 메모</CardTitle>
            <CardDescription className="text-sm">
              이 고객에 대한 메모를 작성하세요. 세션 기록, 특이사항 등을 기록할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrainerNotesForm
              bookingId={booking.id}
              initialNotes={booking.trainer_notes}
              initialSummary={booking.session_summary}
            />
          </CardContent>
        </Card>

        {/* 리뷰 정보 (완료된 예약만) */}
        {booking.status === 'completed' && review && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                고객 리뷰
              </CardTitle>
              <CardDescription className="text-sm">
                이 예약에 대한 고객의 리뷰입니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 별점 */}
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 md:h-6 md:w-6 ${
                      star <= review.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="font-bold text-lg ml-2">{review.rating}.0</span>
              </div>

              {/* 리뷰 내용 */}
              {review.comment && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">리뷰 내용</p>
                  <p className="text-sm md:text-base whitespace-pre-wrap bg-muted/50 p-3 md:p-4 rounded-lg">
                    {review.comment}
                  </p>
                </div>
              )}

              {/* 작성일 */}
              <div className="text-xs text-muted-foreground">
                작성일: {new Date(review.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>

              {/* 트레이너 답글 */}
              <div className="pt-3 border-t">
                <TrainerReviewResponse
                  reviewId={review.id}
                  existingResponse={review.trainer_response}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 리뷰 대기 안내 (완료됐지만 리뷰 없는 경우) */}
        {booking.status === 'completed' && !review && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <Star className="h-5 w-5 text-muted-foreground" />
                고객 리뷰
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6 text-muted-foreground">
                <Star className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm md:text-base">
                  아직 고객이 리뷰를 작성하지 않았습니다
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
