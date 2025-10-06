'use client'

import { useState } from 'react'
import { AlertCircle, Ban, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CANCELLATION_REASON_LABELS, type CancellationReason } from '@/lib/constants'
import { formatPrice, calculateCancellationFee } from '@/lib/utils'

interface CancelBookingDialogProps {
  bookingId: string
  booking_date: string
  start_time: string
  total_price: number
  onCancel: (bookingId: string, reason: CancellationReason, notes?: string) => Promise<void>
  trigger?: React.ReactNode
}

export function CancelBookingDialog({
  bookingId,
  booking_date,
  start_time,
  total_price,
  onCancel,
  trigger
}: CancelBookingDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<CancellationReason>('personal')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 취소 수수료 계산
  const cancellationInfo = calculateCancellationFee(total_price, booking_date, start_time)

  const handleCancel = async () => {
    setIsLoading(true)
    try {
      await onCancel(bookingId, reason, notes)
      setOpen(false)
      // 성공 후 상태 초기화
      setReason('personal')
      setNotes('')
    } catch (error) {
      console.error('Failed to cancel booking:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="sm">
            <Ban className="h-4 w-4 mr-2" />
            예약 취소
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            예약 취소
          </DialogTitle>
          <DialogDescription>
            예약을 취소하시겠습니까? 취소 시점에 따라 수수료가 부과됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 취소 수수료 안내 */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">취소 시기:</span>
                  <span>{cancellationInfo.timeCategory}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">수수료율:</span>
                  <span className="text-destructive font-bold">
                    {(cancellationInfo.feeRate * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="font-medium">취소 수수료:</span>
                  <span className="text-destructive font-bold">
                    {formatPrice(cancellationInfo.feeAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">환불 금액:</span>
                  <span className="text-green-600 font-bold text-lg">
                    {formatPrice(cancellationInfo.refundAmount)}
                  </span>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* 취소 정책 안내 */}
          <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
            <p className="font-semibold mb-2">취소 정책</p>
            <p>• 7일 전: 무료 취소 (수수료 0%)</p>
            <p>• 3-7일 전: 30% 수수료</p>
            <p>• 1-3일 전: 50% 수수료</p>
            <p>• 24시간 이내: 80% 수수료</p>
            <p className="text-destructive">• 노쇼 시: 전액 부과 (환불 불가)</p>
          </div>

          {/* 취소 사유 선택 */}
          <div className="space-y-3">
            <Label>취소 사유 *</Label>
            <RadioGroup value={reason} onValueChange={(value) => setReason(value as CancellationReason)}>
              {Object.entries(CANCELLATION_REASON_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <RadioGroupItem value={key} id={key} />
                  <Label htmlFor={key} className="cursor-pointer font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 상세 사유 (선택) */}
          <div className="space-y-2">
            <Label htmlFor="notes">상세 사유 (선택)</Label>
            <Textarea
              id="notes"
              placeholder="취소 사유를 자세히 입력해주세요..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            돌아가기
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {isLoading ? '취소 처리 중...' : '예약 취소하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
