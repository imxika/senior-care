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
import { formatPrice } from '@/lib/utils'
import { calculateCancellationFee, getCancellationFeeMessage, CANCELLATION_POLICY_TEXT } from '@/lib/cancellation-fee'

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
  const [error, setError] = useState<string | null>(null)

  // 취소 수수료 계산
  const bookingDateTime = `${booking_date}T${start_time}`
  const cancellationInfo = calculateCancellationFee(bookingDateTime, total_price)
  const feeMessage = getCancellationFeeMessage(cancellationInfo)

  const handleCancel = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await onCancel(bookingId, reason, notes)
      setOpen(false)
      // 성공 후 상태 초기화
      setReason('personal')
      setNotes('')
      setError(null)
    } catch (error) {
      console.error('Failed to cancel booking:', error)
      const errorMessage = error instanceof Error ? error.message : '예약 취소 중 오류가 발생했습니다.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="lg" className="h-12 text-base border-2">
            <Ban className="h-5 w-5 mr-2" />
            예약 취소
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertCircle className="h-6 w-6 text-destructive" />
            예약 취소
          </DialogTitle>
          <DialogDescription className="text-base">
            예약을 취소하시겠습니까? 취소 시점에 따라 수수료가 부과됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription className="text-base">{error}</AlertDescription>
            </Alert>
          )}

          {/* 취소 수수료 안내 - 시니어 친화적 */}
          <Alert className="border-2">
            <Info className="h-5 w-5" />
            <AlertDescription>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-base">
                  <span className="font-medium">취소 시기:</span>
                  <span className="font-semibold">{cancellationInfo.timeCategory}</span>
                </div>
                <div className="flex justify-between items-center text-base">
                  <span className="font-medium">수수료율:</span>
                  <span className="text-destructive font-bold text-lg">
                    {(cancellationInfo.feeRate * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center border-t-2 pt-3 text-base">
                  <span className="font-medium">취소 수수료:</span>
                  <span className="text-destructive font-bold text-lg">
                    {formatPrice(cancellationInfo.feeAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-base">
                  <span className="font-medium">환불 금액:</span>
                  <span className="text-green-600 font-bold text-xl">
                    {formatPrice(cancellationInfo.refundAmount)}
                  </span>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* 취소 정책 안내 - 시니어 친화적 */}
          <div className="bg-muted p-4 rounded-lg text-base space-y-2 border-2">
            <p className="font-semibold mb-3 text-lg">취소 정책</p>
            <p className="leading-relaxed">• 7일 전: 무료 취소 (수수료 0%)</p>
            <p className="leading-relaxed">• 3-7일 전: 30% 수수료</p>
            <p className="leading-relaxed">• 1-3일 전: 50% 수수료</p>
            <p className="leading-relaxed">• 24시간 이내: 80% 수수료</p>
            <p className="text-destructive font-medium leading-relaxed">• 노쇼 시: 전액 부과 (환불 불가)</p>
          </div>

          {/* 취소 사유 선택 - 시니어 친화적 */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">취소 사유 *</Label>
            <RadioGroup value={reason} onValueChange={(value) => setReason(value as CancellationReason)}>
              {Object.entries(CANCELLATION_REASON_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted border-2 cursor-pointer">
                  <RadioGroupItem value={key} id={key} className="h-5 w-5" />
                  <Label htmlFor={key} className="cursor-pointer font-normal text-base flex-1">
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 상세 사유 (선택) - 시니어 친화적 */}
          <div className="space-y-3">
            <Label htmlFor="notes" className="text-base font-semibold">상세 사유 (선택)</Label>
            <Textarea
              id="notes"
              placeholder="취소 사유를 자세히 입력해주세요..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="text-base resize-none border-2"
            />
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-2">
          <Button
            variant="outline"
            size="lg"
            className="h-12 text-base border-2 flex-1 sm:flex-none"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            돌아가기
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="h-12 text-base border-2 flex-1 sm:flex-none"
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
