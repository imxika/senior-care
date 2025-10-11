'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, User, DollarSign, Users, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { BookingProgressTracker } from '@/components/booking-progress-tracker'
import { CancelBookingDialog } from '@/components/cancel-booking-dialog'
import { ReviewForm } from '@/components/review-form'
import { cancelBooking } from '@/app/(dashboard)/customer/bookings/[id]/actions'
import { canCancelBooking } from '@/lib/utils'
import type { CancellationReason } from '@/lib/constants'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface CustomerBookingDetailProps {
  booking: {
    id: string
    status: 'pending_payment' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'expired'
    booking_date: string
    start_time: string
    end_time: string
    duration_minutes: number
    service_type: string
    booking_type: 'direct' | 'recommended'
    session_type: string
    total_price: number
    price_per_person?: number
    group_size?: number
    customer_notes?: string
    rejection_reason?: string
    rejection_note?: string
    created_at?: string
    trainer_id?: string
    trainer_matched_at?: string
    trainer_confirmed_at?: string
    service_started_at?: string
    service_completed_at?: string
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
    payments?: Array<{
      id: string
      amount: string
      currency: string
      payment_method: string
      payment_status: string
      payment_provider: string
      paid_at?: string
      created_at: string
      payment_metadata?: Record<string, unknown>
    }>
  }
  existingReview?: {
    id: string
    rating: number
    comment: string
  } | null
}

export function CustomerBookingDetail({ booking, existingReview }: CustomerBookingDetailProps) {
  const router = useRouter()
  const [cancelSuccess, setCancelSuccess] = useState<{ refundAmount: number; feeAmount: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const formatDate = (date: string) => {
    // Force KST interpretation by appending timezone
    const d = new Date(date + 'T00:00:00+09:00')
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
      pending_payment: { label: '결제 대기', variant: 'outline' },
      pending: { label: '대기 중', variant: 'secondary' },
      confirmed: { label: '확정', variant: 'default' },
      in_progress: { label: '진행 중', variant: 'default' },
      completed: { label: '완료', variant: 'outline' },
      cancelled: { label: '취소됨', variant: 'destructive' },
      no_show: { label: '노쇼', variant: 'destructive' },
      expired: { label: '만료됨', variant: 'outline' }
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
      toast.error('예약 취소 실패', {
        description: result.error,
        duration: 5000,
      })
      return
    }

    if (result.success) {
      setCancelSuccess({
        refundAmount: result.refundAmount || 0,
        feeAmount: result.feeAmount || 0
      })

      // 성공 토스트
      toast.success('예약이 취소되었습니다', {
        description: result.message || `취소 수수료 ${(result.feeAmount || 0).toLocaleString()}원, 환불 금액 ${(result.refundAmount || 0).toLocaleString()}원`,
        duration: 6000,
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
                       booking.status !== 'expired' &&
                       booking.status !== 'pending_payment' &&
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
        {/* 만료 메시지 */}
        {booking.status === 'expired' && (
          <Alert className="border-gray-300 bg-gray-50">
            <AlertCircle className="h-4 w-4 text-gray-600" />
            <AlertDescription className="text-gray-800">
              <div className="space-y-1">
                <p className="font-bold">⏰ 결제 시간이 만료되었습니다</p>
                <p className="text-sm">
                  {booking.booking_type === 'direct'
                    ? '결제 시간(10분) 내에 결제하지 않아 예약이 자동으로 취소되었습니다.'
                    : '결제 시간(24시간) 내에 결제하지 않아 예약이 자동으로 취소되었습니다.'}
                </p>
                <p className="text-sm text-gray-600">다시 예약하시려면 새로 예약을 생성해주세요.</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 결제 대기 메시지 */}
        {booking.status === 'pending_payment' && (
          <Alert className="border-blue-300 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="space-y-2">
                <p className="font-bold">💳 결제를 완료해주세요</p>
                <p className="text-sm">
                  {booking.booking_type === 'direct'
                    ? '10분 이내에 결제를 완료하지 않으면 예약이 자동으로 취소됩니다.'
                    : '24시간 이내에 결제를 완료하지 않으면 예약이 자동으로 취소됩니다.'}
                </p>
                <Link href={`/checkout/${booking.id}`}>
                  <Button className="w-full mt-2">결제하러 가기 →</Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

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
          createdAt={booking.created_at || new Date().toISOString()}
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
            <CardDescription className="text-xs md:text-sm font-mono mt-1">
              예약번호: {booking.id}
            </CardDescription>
            {!canCancel && booking.status !== 'cancelled' && booking.status !== 'completed' && (
              <CardDescription className="text-orange-600 text-sm mt-1">
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

              {booking.group_size && booking.group_size > 1 && (
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
        {booking.trainer && booking.status !== 'pending' ? (
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
              <CardTitle className="text-lg md:text-xl">
                {booking.trainer ? '트레이너 승인 대기 중' : '트레이너 매칭 대기 중'}
              </CardTitle>
              <CardDescription className="text-sm">
                {booking.trainer
                  ? '트레이너가 예약을 확인하고 있습니다. 승인되면 알림을 보내드립니다.'
                  : '관리자가 최적의 트레이너를 매칭하고 있습니다. 매칭이 완료되면 알림을 보내드립니다.'
                }
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* 주차 안내 */}
        {booking.service_type === 'home_visit' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1 md:mb-2 text-base md:text-lg">🅿️ 주차 안내</p>
            <ul className="space-y-1 text-sm md:text-base">
              <li>• 고객 측 주차 제공 불가 시, 인근 유료 주차장 이용</li>
              <li>• 주차비는 서비스 종료 후 별도 청구됩니다</li>
            </ul>
          </div>
        )}

        {/* 결제 정보 */}
        {booking.total_price > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">💳 결제 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* 가격 정보 */}
                {booking.group_size && booking.group_size > 1 && booking.price_per_person && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">인당 가격</span>
                    <span>{booking.price_per_person.toLocaleString()}원</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>총 예약 금액</span>
                  <span className="text-lg">{booking.total_price.toLocaleString()}원</span>
                </div>

                {/* 결제 상태 */}
                {booking.payments && booking.payments.length > 0 && (
                  <>
                    <div className="border-t pt-3 mt-3 space-y-2">
                      {booking.payments.map((payment) => {
                        const statusBadge = (() => {
                          const variants = {
                            paid: { label: '✅ 결제 완료', color: 'bg-green-100 text-green-700', variant: 'default' as const },
                            pending: { label: '⏳ 결제 대기', color: 'bg-yellow-100 text-yellow-700', variant: 'secondary' as const },
                            failed: { label: '❌ 결제 실패', color: 'bg-red-100 text-red-700', variant: 'destructive' as const },
                            cancelled: { label: '🚫 취소', color: 'bg-gray-100 text-gray-700', variant: 'outline' as const },
                            refunded: { label: '💰 환불 완료', color: 'bg-blue-100 text-blue-700', variant: 'outline' as const },
                          }
                          return variants[payment.payment_status as keyof typeof variants] || variants.pending
                        })()

                        const providerLabel = payment.payment_provider === 'stripe' ? '💵 Stripe' : '💳 Toss'

                        // 환불/취소 정보 추출
                        const metadata = payment.payment_metadata as Record<string, unknown> | undefined
                        const cancellationType = metadata?.cancellationType as string | undefined
                        const feeRate = metadata?.feeRate as number | undefined
                        const feeAmount = metadata?.feeAmount as number | undefined
                        const refundAmount = metadata?.refundAmount as number | undefined
                        const capturedAmount = metadata?.capturedAmount as number | undefined

                        return (
                          <div key={payment.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant={statusBadge.variant} className="text-xs">
                                {statusBadge.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{providerLabel}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-muted-foreground">결제 금액</p>
                                <p className="font-semibold">{parseFloat(payment.amount).toLocaleString()}원</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">결제 수단</p>
                                <p className="font-semibold">{payment.payment_method || '카드'}</p>
                              </div>
                              {payment.paid_at && (
                                <div className="col-span-2">
                                  <p className="text-muted-foreground">결제 완료 시각</p>
                                  <p className="font-semibold">
                                    {new Date(payment.paid_at).toLocaleString('ko-KR', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              )}

                              {/* 취소/환불 정보 */}
                              {(payment.payment_status === 'cancelled' || payment.payment_status === 'refunded') && cancellationType && (
                                <>
                                  <div className="col-span-2 border-t pt-2 mt-2">
                                    <p className="text-muted-foreground mb-1 font-semibold">취소/환불 상세</p>
                                  </div>
                                  {feeRate !== undefined && (
                                    <div className="col-span-2">
                                      <p className="text-muted-foreground">취소 수수료율</p>
                                      <p className="font-semibold text-orange-600">{(feeRate * 100).toFixed(0)}%</p>
                                    </div>
                                  )}
                                  {feeAmount !== undefined && (
                                    <div>
                                      <p className="text-muted-foreground">취소 수수료</p>
                                      <p className="font-semibold text-orange-600">{feeAmount.toLocaleString()}원</p>
                                    </div>
                                  )}
                                  {refundAmount !== undefined && (
                                    <div>
                                      <p className="text-muted-foreground">환불 금액</p>
                                      <p className="font-semibold text-green-600">{refundAmount.toLocaleString()}원</p>
                                    </div>
                                  )}
                                  {cancellationType && (
                                    <div className="col-span-2">
                                      <p className="text-muted-foreground">처리 방식</p>
                                      <p className="font-semibold text-xs">
                                        {cancellationType === 'full_refund' && '전액 환불'}
                                        {cancellationType === 'partial_refund' && '부분 환불'}
                                        {cancellationType === 'partial_capture' && '부분 청구'}
                                        {cancellationType === 'full_capture' && '전액 청구'}
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}

                              <div className="col-span-2">
                                <p className="text-muted-foreground">결제 ID</p>
                                <p className="font-mono text-xs">{payment.id.slice(0, 12)}...</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* 결제 대기 상태 */}
                {(!booking.payments || booking.payments.length === 0) && (
                  <div className={`rounded-lg p-4 mt-3 space-y-3 ${
                    booking.status === 'completed'
                      ? 'bg-blue-50 border border-blue-200'
                      : booking.status === 'expired'
                      ? 'bg-gray-50 border border-gray-200'
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}>
                    <p className={`text-sm md:text-base flex items-center gap-2 font-medium ${
                      booking.status === 'completed'
                        ? 'text-blue-800'
                        : booking.status === 'expired'
                        ? 'text-gray-800'
                        : 'text-yellow-800'
                    }`}>
                      <AlertCircle className="h-4 w-4" />
                      {booking.status === 'completed'
                        ? '서비스 완료 후 정산 예정입니다'
                        : booking.status === 'expired'
                        ? '결제 시간 만료로 결제 불가'
                        : '결제 대기 중입니다'}
                    </p>
                    {booking.status !== 'completed' &&
                     booking.status !== 'cancelled' &&
                     booking.status !== 'expired' && (
                      <>
                        <p className="text-xs md:text-sm text-yellow-700">
                          {booking.booking_type === 'direct'
                            ? '결제를 완료하시면 트레이너에게 예약 요청이 전달됩니다.'
                            : '결제를 완료하시면 관리자가 트레이너를 매칭해드립니다.'
                          }
                        </p>
                        <Button
                          className="w-full"
                          variant="default"
                          size="lg"
                          onClick={() => {
                            window.location.href = `/checkout/${booking.id}`
                          }}
                        >
                          결제하기
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 리뷰 섹션 - 완료된 예약만 */}
        {booking.status === 'completed' && booking.trainer?.id && (
          <ReviewForm
            bookingId={booking.id}
            trainerId={booking.trainer.id}
            existingReview={existingReview}
          />
        )}
      </div>
    </div>
  )
}
