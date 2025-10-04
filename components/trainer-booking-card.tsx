'use client'

import { Clock, User, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { updateBookingStatus } from '@/app/(dashboard)/trainer/bookings/actions'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface TrainerBookingCardProps {
  booking: any
  showActions?: boolean
  actionType?: 'approve' | 'complete'
}

export function TrainerBookingCard({
  booking,
  showActions = false,
  actionType = 'approve'
}: TrainerBookingCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const scheduledDate = new Date(booking.scheduled_at)
  const isToday = scheduledDate.toDateString() === new Date().toDateString()

  const handleStatusUpdate = async (status: 'confirmed' | 'rejected' | 'completed' | 'no_show') => {
    setIsLoading(true)
    const result = await updateBookingStatus(booking.id, status)
    setIsLoading(false)

    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
  }

  return (
    <Card className={isToday ? 'border-l-4 border-l-primary' : ''}>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* 예약 정보 */}
          <div className="flex-1 space-y-3">
            {/* 시간 */}
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-semibold text-lg">
                  {scheduledDate.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {scheduledDate.toLocaleDateString('ko-KR', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                  })}
                </div>
              </div>
            </div>

            {/* 고객 정보 */}
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-semibold">
                  {booking.customer?.full_name || '고객 정보 없음'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {booking.customer?.phone || booking.customer?.email}
                </div>
              </div>
            </div>

            {/* 서비스 유형 */}
            <div className="flex items-center gap-2">
              <Badge variant={booking.service_type === 'home' ? 'default' : 'secondary'}>
                {booking.service_type === 'home' ? '방문 서비스' : '센터 방문'}
              </Badge>
              <Badge variant="outline">
                {booking.duration_minutes}분
              </Badge>
            </div>

            {/* 메모 */}
            {booking.notes && (
              <div className="bg-muted rounded-lg p-3 text-sm">
                <span className="font-semibold">고객 메모: </span>
                <span>{booking.notes}</span>
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          {showActions && (
            <div className="flex flex-col gap-2 min-w-[140px]">
              {actionType === 'approve' && (
                <>
                  <Button
                    onClick={() => handleStatusUpdate('confirmed')}
                    disabled={isLoading}
                    className="w-full"
                  >
                    승인
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate('rejected')}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full"
                  >
                    거절
                  </Button>
                </>
              )}
              {actionType === 'complete' && (
                <>
                  <Button
                    onClick={() => handleStatusUpdate('completed')}
                    disabled={isLoading}
                    className="w-full"
                  >
                    완료 처리
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate('no_show')}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full"
                  >
                    노쇼
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
