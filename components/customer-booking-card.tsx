'use client'

import { Calendar, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cancelBooking } from '@/app/(dashboard)/customer/bookings/actions'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BOOKING_STATUS,
  BOOKING_STATUS_CONFIG,
  SERVICE_TYPE_LABELS,
  BOOKING_CONFIG
} from '@/lib/constants'
import {
  combineDateTime,
  getHoursUntilBooking,
  isBookingPast,
  formatDate,
  formatTime
} from '@/lib/utils'
import type { BookingWithDetails } from '@/lib/types'

interface CustomerBookingCardProps {
  booking: BookingWithDetails
}

export function CustomerBookingCard({ booking }: CustomerBookingCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // 날짜/시간 계산 (utils 사용)
  const scheduledDate = combineDateTime(booking.booking_date, booking.start_time)
  const isPast = isBookingPast(booking)
  const canCancel = booking.status === BOOKING_STATUS.PENDING || booking.status === BOOKING_STATUS.CONFIRMED
  const hoursUntilBooking = getHoursUntilBooking(booking)

  const handleCancel = async () => {
    if (!confirm('정말로 이 예약을 취소하시겠습니까?')) {
      return
    }

    setIsLoading(true)
    const result = await cancelBooking(booking.id)
    setIsLoading(false)

    if (result.error) {
      alert(result.error)
    } else {
      alert('예약이 취소되었습니다.')
      router.refresh()
    }
  }

  // 상태 설정 가져오기 (constants 사용)
  const status = booking.status ? (BOOKING_STATUS_CONFIG[booking.status as keyof typeof BOOKING_STATUS_CONFIG] || BOOKING_STATUS_CONFIG.pending) : BOOKING_STATUS_CONFIG.pending

  return (
    <Card className="hover:shadow-md transition-all cursor-pointer" onClick={() => router.push(`/customer/bookings/${booking.id}`)}>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* 왼쪽: 예약 정보 */}
          <div className="flex-1 space-y-4" onClick={(e) => e.stopPropagation()}>
            {/* 트레이너 정보 */}
            {booking.trainer_id ? (
              <Link
                href={`/trainers/${booking.trainer_id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors group"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={booking.trainer?.profiles?.avatar_url || undefined} />
                  <AvatarFallback>
                    {booking.trainer?.profiles?.full_name?.charAt(0) || 'T'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-semibold text-lg group-hover:text-primary transition-colors">
                    {booking.trainer?.profiles?.full_name ||
                     booking.trainer?.profiles?.email?.split('@')[0] ||
                     '트레이너'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3 p-2">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={booking.trainer?.profiles?.avatar_url || undefined} />
                  <AvatarFallback>T</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-semibold text-lg text-muted-foreground">
                    매칭 대기 중
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      추천 예약
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* 일정 정보 (utils 사용) */}
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {formatDate(scheduledDate)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatTime(scheduledDate)} • {booking.duration_minutes}분
                </div>
              </div>
            </div>

            {/* 서비스 정보 (constants 사용) */}
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <Badge variant="outline">
                {SERVICE_TYPE_LABELS[booking.service_type as keyof typeof SERVICE_TYPE_LABELS] || booking.service_type}
              </Badge>
            </div>

            {/* 메모 */}
            {booking.customer_notes && (
              <div className="bg-muted rounded-lg p-3 text-sm">
                <span className="font-semibold">요청사항: </span>
                <span>{booking.customer_notes}</span>
              </div>
            )}
          </div>

          {/* 오른쪽: 액션 버튼 */}
          <div className="flex flex-col gap-2 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/customer/bookings/${booking.id}`)}
            >
              상세보기
            </Button>
            {canCancel && !isPast && (
              <>
                <Button
                  onClick={handleCancel}
                  disabled={isLoading}
                  variant="destructive"
                  className="w-full"
                >
                  예약 취소
                </Button>
                {hoursUntilBooking < BOOKING_CONFIG.CANCELLATION_HOURS && (
                  <p className="text-xs text-muted-foreground text-center">
                    {BOOKING_CONFIG.CANCELLATION_HOURS}시간 이내 취소 불가
                  </p>
                )}
              </>
            )}
            {booking.status === BOOKING_STATUS.COMPLETED && (
              <Button variant="outline" className="w-full">
                리뷰 작성
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
