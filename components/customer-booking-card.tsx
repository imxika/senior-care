'use client'

import { Clock, User, MapPin, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cancelBooking } from '@/app/(dashboard)/customer/bookings/actions'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CustomerBookingCardProps {
  booking: any
}

const statusConfig = {
  pending: { label: '승인 대기', variant: 'secondary' as const, color: 'text-yellow-600' },
  confirmed: { label: '확정됨', variant: 'default' as const, color: 'text-green-600' },
  completed: { label: '완료됨', variant: 'outline' as const, color: 'text-gray-600' },
  cancelled: { label: '취소됨', variant: 'destructive' as const, color: 'text-red-600' },
  rejected: { label: '거절됨', variant: 'destructive' as const, color: 'text-red-600' },
  no_show: { label: '노쇼', variant: 'destructive' as const, color: 'text-red-600' },
}

export function CustomerBookingCard({ booking }: CustomerBookingCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const scheduledDate = new Date(booking.scheduled_at)
  const now = new Date()
  const isPast = scheduledDate < now
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed'
  const hoursUntilBooking = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60)

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

  const status = statusConfig[booking.status as keyof typeof statusConfig] || statusConfig.pending

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* 왼쪽: 예약 정보 */}
          <div className="flex-1 space-y-4">
            {/* 트레이너 정보 */}
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={booking.trainer?.profiles?.avatar_url} />
                <AvatarFallback>
                  {booking.trainer?.profiles?.full_name?.charAt(0) || 'T'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-lg">
                  {booking.trainer?.profiles?.full_name || '트레이너'}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
              </div>
            </div>

            {/* 일정 정보 */}
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {scheduledDate.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                  })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {scheduledDate.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })} • {booking.duration_minutes}분
                </div>
              </div>
            </div>

            {/* 서비스 정보 */}
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <Badge variant="outline">
                {booking.service_type === 'home' ? '방문 서비스' : '센터 방문'}
              </Badge>
            </div>

            {/* 메모 */}
            {booking.notes && (
              <div className="bg-muted rounded-lg p-3 text-sm">
                <span className="font-semibold">요청사항: </span>
                <span>{booking.notes}</span>
              </div>
            )}
          </div>

          {/* 오른쪽: 액션 버튼 */}
          <div className="flex flex-col gap-2 min-w-[140px]">
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
                {hoursUntilBooking < 24 && (
                  <p className="text-xs text-muted-foreground text-center">
                    24시간 이내 취소 불가
                  </p>
                )}
              </>
            )}
            {booking.status === 'completed' && (
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
