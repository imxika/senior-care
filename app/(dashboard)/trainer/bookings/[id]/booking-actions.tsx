'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
import { updateBookingStatus } from '../actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Clock } from 'lucide-react'

const REJECTION_REASONS = [
  { value: 'personal_emergency', label: '개인 사정' },
  { value: 'health_issue', label: '건강 문제' },
  { value: 'schedule_conflict', label: '일정 충돌' },
  { value: 'distance_too_far', label: '거리가 너무 멈' },
  { value: 'customer_requirements', label: '고객 요구사항 불일치' },
  { value: 'other', label: '기타' },
] as const

interface BookingActionsProps {
  bookingId: string
  status: string
  adminMatchedAt: string | null
}

export function BookingActions({ bookingId, status, adminMatchedAt }: BookingActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState<string>('')
  const [rejectionNote, setRejectionNote] = useState('')

  // 매칭 후 1시간 경과 여부 확인
  const isRejectionAllowed = () => {
    if (!adminMatchedAt) return true // 매칭 시간 없으면 허용 (직접 예약)

    const matchedTime = new Date(adminMatchedAt)
    const now = new Date()
    const hoursPassed = (now.getTime() - matchedTime.getTime()) / (1000 * 60 * 60)

    return hoursPassed < 1
  }

  const getTimeRemaining = () => {
    if (!adminMatchedAt) return null

    const matchedTime = new Date(adminMatchedAt)
    const deadline = new Date(matchedTime.getTime() + 60 * 60 * 1000) // +1시간
    const now = new Date()
    const minutesRemaining = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60))

    if (minutesRemaining <= 0) return '시간 만료'
    if (minutesRemaining < 60) return `${minutesRemaining}분 남음`
    return '1시간 이내'
  }

  const handleApprove = async () => {
    setIsLoading(true)
    const result = await updateBookingStatus(bookingId, 'confirmed')
    setIsLoading(false)

    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
      router.push('/trainer/bookings')
    }
  }

  const handleReject = () => {
    if (!isRejectionAllowed()) {
      alert('매칭 후 1시간이 경과하여 거절할 수 없습니다.')
      return
    }
    setShowRejectDialog(true)
  }

  const confirmReject = async () => {
    if (!rejectionReason) {
      alert('거절 사유를 선택해주세요')
      return
    }

    setIsLoading(true)
    const result = await updateBookingStatus(
      bookingId,
      'cancelled',
      rejectionReason as any,
      rejectionNote
    )
    setIsLoading(false)

    if (result.error) {
      alert(result.error)
    } else {
      setShowRejectDialog(false)
      router.refresh()
      router.push('/trainer/bookings')
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    const result = await updateBookingStatus(bookingId, 'completed')
    setIsLoading(false)

    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
  }

  const handleNoShow = async () => {
    setIsLoading(true)
    const result = await updateBookingStatus(bookingId, 'no_show')
    setIsLoading(false)

    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
  }

  // 상태에 따른 버튼 표시
  if (status === 'pending') {
    const canReject = isRejectionAllowed()
    const timeRemaining = getTimeRemaining()

    return (
      <>
        <div className="space-y-4">
          {adminMatchedAt && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                {canReject ? (
                  <>거절 가능 시간: <strong>{timeRemaining}</strong></>
                ) : (
                  <>매칭 후 1시간이 경과하여 자동 승인되었습니다.</>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleApprove}
              disabled={isLoading}
              size="lg"
              className="flex-1"
            >
              승인
            </Button>
            <Button
              onClick={handleReject}
              disabled={isLoading || !canReject}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              거절
            </Button>
          </div>
        </div>

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

  if (status === 'confirmed') {
    return (
      <div className="flex gap-3">
        <Button
          onClick={handleComplete}
          disabled={isLoading}
          size="lg"
          className="flex-1"
        >
          완료 처리
        </Button>
        <Button
          onClick={handleNoShow}
          disabled={isLoading}
          variant="outline"
          size="lg"
          className="flex-1"
        >
          노쇼
        </Button>
      </div>
    )
  }

  return null
}
