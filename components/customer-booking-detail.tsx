'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, User, DollarSign, Users, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { BookingProgressTracker } from '@/components/booking-progress-tracker'
import { CancelBookingDialog } from '@/components/cancel-booking-dialog'
import { cancelBooking } from '@/app/(dashboard)/customer/bookings/[id]/actions'
import { canCancelBooking } from '@/lib/utils'
import type { CancellationReason } from '@/lib/constants'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'

interface CustomerBookingDetailProps {
  booking: {
    id: string
    status: string
    booking_date: string
    start_time: string
    end_time: string
    duration_minutes: number
    service_type: string
    booking_type: string
    session_type: string
    total_price: number
    customer_notes?: string
    rejection_reason?: string
    rejection_note?: string
    booking_address?: {
      id: string
      address: string
      address_detail?: string
      address_label?: string
    }
    trainer?: {
      id: string
      hourly_rate?: number
      profiles?: {
        full_name?: string
        phone?: string
        email?: string
      }
    }
  }
}

export function CustomerBookingDetail({ booking }: CustomerBookingDetailProps) {
  const router = useRouter()
  const [cancelSuccess, setCancelSuccess] = useState<{ refundAmount: number; feeAmount: number } | null>(null)

  const formatDate = (date: string) => {
    const d = new Date(date)
    const month = d.getMonth() + 1
    const day = d.getDate()
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
    return `${month}.${day} (${weekday})`
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

  const getSessionTypeLabel = (type: string) => {
    return type === '1:1' ? '1:1 개인 세션' : type === '2:1' ? '2:1 소그룹 (2명)' : '3:1 소그룹 (3명)'
  }

  // 취소 가능 여부 확인
  const { canCancel, hoursUntil } = canCancelBooking({
    booking_date: booking.booking_date,
    start_time: booking.start_time
  })

  const handleCancelBooking = async (bookingId: string, reason: CancellationReason, notes?: string) => {
    const result = await cancelBooking(bookingId, reason, notes)

    if ('error' in result) {
      alert(result.error)
      return
    }

    if (result.success) {
      setCancelSuccess({
        refundAmount: result.refundAmount,
        feeAmount: result.feeAmount
      })

      // 2초 후 페이지 새로고침
      setTimeout(() => {
        router.refresh()
      }, 2000)
    }
  }

  // 취소 불가능한 상태들
  const isCancellable = booking.status !== 'cancelled' &&
                       booking.status !== 'completed' &&
                       booking.status !== 'no_show' &&
                       canCancel

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="mb-4 md:mb-6">
        <Link href="/customer/bookings">
          <Button variant="ghost" size="sm" className="mb-3 md:mb-4 -ml-2">
            ← 예약 목록으로
          </Button>
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold">예약 상세</h1>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* 취소 성공 메시지 */}
        {cancelSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="space-y-1">
                <p className="font-bold">✓ 예약이 취소되었습니다</p>
                <p className="text-sm">취소 수수료: {cancelSuccess.feeAmount.toLocaleString()}원</p>
                <p className="text-sm">환불 금액: {cancelSuccess.refundAmount.toLocaleString()}원</p>
                <p className="text-xs text-green-600">환불은 영업일 기준 3-5일 내에 처리됩니다.</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

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
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg md:text-xl">예약 정보</CardTitle>
                {getStatusBadge(booking.status)}
              </div>
              {isCancellable && (
                <CancelBookingDialog
                  bookingId={booking.id}
                  booking_date={booking.booking_date}
                  start_time={booking.start_time}
                  total_price={booking.total_price}
                  onCancel={handleCancelBooking}
                />
              )}
            </div>
            {!canCancel && booking.status !== 'cancelled' && booking.status !== 'completed' && (
              <CardDescription className="text-orange-600 text-sm">
                취소는 예약 24시간 전까지만 가능합니다 (남은 시간: {Math.round(hoursUntil)}시간)
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">예약 일시</p>
                  <p className="font-medium text-base">{formatDate(booking.booking_date)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">시간</p>
                  <p className="font-medium text-base">
                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                    <span className="text-sm text-muted-foreground ml-2">
                      ({booking.duration_minutes}분)
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">서비스 유형</p>
                  <p className="font-medium text-base">{getServiceTypeLabel(booking.service_type)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">예약 타입</p>
                  <p className="font-medium text-base">{getBookingTypeLabel(booking.booking_type)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">세션 유형</p>
                  <p className="font-medium text-base">{getSessionTypeLabel(booking.session_type || '1:1')}</p>
                </div>
              </div>

              {booking.group_size > 1 && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">참가 인원</p>
                    <p className="font-medium text-base">{booking.group_size}명</p>
                  </div>
                </div>
              )}

              {booking.service_type === 'home_visit' && (
                <div className="flex items-start gap-3 md:col-span-2">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-muted-foreground">방문 주소</p>
                    {booking.booking_address ? (
                      <>
                        {booking.booking_address.address_label && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded mr-2">
                            {booking.booking_address.address_label}
                          </span>
                        )}
                        <p className="font-medium text-sm md:text-base break-words">{booking.booking_address.address}</p>
                        {booking.booking_address.address_detail && (
                          <p className="text-xs md:text-sm text-muted-foreground break-words">{booking.booking_address.address_detail}</p>
                        )}
                      </>
                    ) : (
                      <p className="font-medium text-sm md:text-base text-muted-foreground">주소 정보 없음</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {booking.customer_notes && booking.customer_notes.split('[요청 정보]')[0].trim() && (
              <div className="pt-3 md:pt-4 border-t">
                <p className="text-xs md:text-sm text-muted-foreground mb-2">요청사항</p>
                <p className="text-sm md:text-base whitespace-pre-wrap break-words">{booking.customer_notes.split('[요청 정보]')[0].trim()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 트레이너 정보 */}
        {booking.trainer ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">배정된 트레이너</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-muted-foreground">이름</p>
                    <p className="font-medium text-base md:text-lg">
                      {booking.trainer.profiles?.full_name || '이름 없음'}
                    </p>
                  </div>
                </div>

                {booking.trainer.profiles?.phone && (
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">연락처</p>
                    <p className="font-medium text-sm md:text-base">{booking.trainer.profiles.phone}</p>
                  </div>
                )}

                {booking.trainer.profiles?.email && (
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">이메일</p>
                    <p className="font-medium text-sm md:text-base break-all">{booking.trainer.profiles.email}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">트레이너 매칭 대기 중</CardTitle>
              <CardDescription className="text-sm">
                관리자가 최적의 트레이너를 매칭하고 있습니다. 매칭이 완료되면 알림을 보내드립니다.
              </CardDescription>
            </CardHeader>
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
                    <span>{booking.price_per_person.toLocaleString()}원</span>
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
      </div>
    </div>
  )
}
