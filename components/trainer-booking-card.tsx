'use client'

import { Clock, User, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { updateBookingStatus } from '@/app/(dashboard)/trainer/bookings/actions'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SERVICE_TYPE_LABELS } from '@/lib/constants'
import { combineDateTime, formatDate, formatTime } from '@/lib/utils'
import type { BookingWithDetails } from '@/lib/types'

const REJECTION_REASONS = [
  { value: 'personal_emergency', label: '개인 사정' },
  { value: 'health_issue', label: '건강 문제' },
  { value: 'schedule_conflict', label: '일정 충돌' },
  { value: 'distance_too_far', label: '거리가 너무 멈' },
  { value: 'customer_requirements', label: '고객 요구사항 불일치' },
  { value: 'other', label: '기타' },
] as const

interface TrainerBookingCardProps {
  booking: BookingWithDetails
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
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState<string>('')
  const [rejectionNote, setRejectionNote] = useState('')

  // utils 사용
  const scheduledDate = combineDateTime(booking.booking_date, booking.start_time)
  const isToday = scheduledDate.toDateString() === new Date().toDateString()

  const handleStatusUpdate = async (status: 'confirmed' | 'cancelled' | 'completed' | 'no_show') => {
    setIsLoading(true)
    const result = await updateBookingStatus(booking.id, status)
    setIsLoading(false)

    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
  }

  const handleReject = () => {
    setShowRejectDialog(true)
  }

  const confirmReject = async () => {
    if (!rejectionReason) {
      alert('거절 사유를 선택해주세요')
      return
    }

    setIsLoading(true)
    const result = await updateBookingStatus(
      booking.id,
      'cancelled',
      rejectionReason as 'personal_emergency' | 'health_issue' | 'schedule_conflict' | 'distance_too_far' | 'customer_requirements' | 'other',
      rejectionNote
    )
    setIsLoading(false)

    if (result.error) {
      alert(result.error)
    } else {
      setShowRejectDialog(false)
      router.refresh()
    }
  }

  const handleCardClick = () => {
    router.push(`/trainer/bookings/${booking.id}`)
  }

  return (
    <>
      <Card className={isToday ? 'border-l-4 border-l-primary' : ''}>
        <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* 예약 정보 */}
          <div
            className="flex-1 space-y-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleCardClick}
          >
            {/* 시간 (utils 사용) */}
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-semibold text-lg">
                  {formatTime(scheduledDate)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(scheduledDate, {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short'
                  })}
                </div>
              </div>
            </div>

            {/* 고객 정보 (올바른 경로) */}
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-semibold">
                  {booking.customer?.profiles?.full_name || '고객 정보 없음'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {booking.customer?.profiles?.phone || booking.customer?.profiles?.email}
                </div>
              </div>
            </div>

            {/* 서비스 유형 (constants 사용) */}
            <div className="flex items-center gap-2">
              <Badge variant={booking.service_type === 'home_visit' ? 'default' : 'secondary'}>
                {SERVICE_TYPE_LABELS[booking.service_type as keyof typeof SERVICE_TYPE_LABELS] || booking.service_type}
              </Badge>
              <Badge variant="outline">
                {booking.duration_minutes}분
              </Badge>
            </div>

            {/* 메모 */}
            {booking.customer_notes && (
              <div className="bg-muted rounded-lg p-3 text-sm">
                <span className="font-semibold">고객 메모: </span>
                <span>{booking.customer_notes}</span>
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          {showActions ? (
            <div
              className="flex flex-col gap-2 min-w-[140px]"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                onClick={handleCardClick}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-1" />
                상세보기
              </Button>
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
                    onClick={handleReject}
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
          ) : (
            <div
              className="flex flex-col gap-2 min-w-[140px]"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                onClick={handleCardClick}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-1" />
                상세보기
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    {/* 거절 사유 다이얼로그 */}
    <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>예약 거절</DialogTitle>
          <DialogDescription>
            예약을 거절하는 사유를 선택해주세요. 패널티 측정에 사용됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">거절 사유 *</Label>
            <Select value={rejectionReason} onValueChange={setRejectionReason}>
              <SelectTrigger>
                <SelectValue placeholder="사유를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">추가 설명 (선택)</Label>
            <Textarea
              id="note"
              placeholder="거절 사유에 대한 추가 설명을 입력하세요"
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowRejectDialog(false)}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            onClick={confirmReject}
            disabled={isLoading || !rejectionReason}
            variant="destructive"
          >
            {isLoading ? '처리 중...' : '거절하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
