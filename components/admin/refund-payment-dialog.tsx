'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { RefreshCw, AlertCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { calculateCancellationFee } from '@/lib/utils'

interface RefundPaymentDialogProps {
  paymentId: string
  amount: string
  provider: string
  bookingDate?: string // YYYY-MM-DD
  startTime?: string   // HH:MM:SS
}

export function RefundPaymentDialog({ paymentId, amount, provider, bookingDate, startTime }: RefundPaymentDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [refundType, setRefundType] = useState<'full' | 'partial' | 'custom'>('full')
  const [customAmount, setCustomAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // 취소 수수료 계산 (예약 날짜/시간이 있는 경우만)
  const cancellationInfo = bookingDate && startTime
    ? calculateCancellationFee(parseFloat(amount), bookingDate, startTime)
    : null

  // 환불 금액 계산
  const getRefundAmount = () => {
    if (refundType === 'full') {
      return parseFloat(amount)
    } else if (refundType === 'partial' && cancellationInfo) {
      return cancellationInfo.refundAmount
    } else if (refundType === 'custom' && customAmount) {
      return parseFloat(customAmount)
    }
    return 0
  }

  const handleRefund = async () => {
    if (!reason.trim()) {
      toast.error('환불 사유를 입력해주세요')
      return
    }

    const refundAmount = getRefundAmount()
    if (refundAmount <= 0 || refundAmount > parseFloat(amount)) {
      toast.error('올바른 환불 금액을 입력해주세요')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          refundAmount: refundType === 'full' ? null : refundAmount, // null이면 전액 환불
          cancellationInfo: refundType === 'partial' ? cancellationInfo : null
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '환불 처리에 실패했습니다')
      }

      toast.success('환불이 성공적으로 처리되었습니다')
      setOpen(false)
      setReason('')
      setRefundType('full')
      setCustomAmount('')
      router.refresh()
    } catch (error) {
      console.error('Refund error:', error)
      const errorMessage = error instanceof Error ? error.message : '환불 처리 중 오류가 발생했습니다';
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          환불
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>결제 환불</DialogTitle>
          <DialogDescription>
            환불을 진행하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* 결제 정보 */}
          <div className="space-y-2">
            <Label>결제 정보</Label>
            <div className="bg-muted p-3 rounded-md text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">금액:</span>{' '}
                <span className="font-medium">{parseFloat(amount).toLocaleString()}원</span>
              </p>
              <p>
                <span className="text-muted-foreground">결제 수단:</span>{' '}
                <span className="font-medium">{provider === 'stripe' ? 'Stripe' : 'Toss Payments'}</span>
              </p>
              <p>
                <span className="text-muted-foreground">결제 ID:</span>{' '}
                <span className="font-mono text-xs">{paymentId}</span>
              </p>
            </div>
          </div>

          {/* 환불 유형 선택 */}
          <div className="space-y-3">
            <Label>환불 유형</Label>
            <RadioGroup value={refundType} onValueChange={(value) => setRefundType(value as 'full' | 'partial')}>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="full" id="full" />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="full" className="text-sm font-medium cursor-pointer">
                    전액 환불
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {parseFloat(amount).toLocaleString()}원 전액 환불
                  </p>
                </div>
              </div>

              {cancellationInfo && (
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="partial" id="partial" />
                  <div className="grid gap-1.5 leading-none">
                    <label htmlFor="partial" className="text-sm font-medium cursor-pointer">
                      부분 환불 (취소 수수료 정책 적용)
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {cancellationInfo.timeCategory}: 수수료 {(cancellationInfo.feeRate * 100).toFixed(0)}% ({cancellationInfo.feeAmount.toLocaleString()}원)
                    </p>
                    <p className="text-xs font-medium text-blue-600">
                      환불 금액: {cancellationInfo.refundAmount.toLocaleString()}원
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <div className="grid gap-1.5 leading-none flex-1">
                  <label htmlFor="custom" className="text-sm font-medium cursor-pointer">
                    사용자 지정 금액
                  </label>
                  <Input
                    type="number"
                    placeholder="환불 금액 입력 (원)"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    disabled={refundType !== 'custom' || isLoading}
                    min="0"
                    max={amount}
                    className="mt-1"
                  />
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* 환불 금액 요약 */}
          {refundType !== 'full' && getRefundAmount() > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-800 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">환불 예정 금액</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">원금</span>
                  <span className="font-medium">{parseFloat(amount).toLocaleString()}원</span>
                </div>
                {refundType === 'partial' && cancellationInfo && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">취소 수수료</span>
                    <span className="font-medium text-red-600">-{cancellationInfo.feeAmount.toLocaleString()}원</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                  <span className="text-blue-800 font-medium">환불 금액</span>
                  <span className="font-bold text-blue-900">{getRefundAmount().toLocaleString()}원</span>
                </div>
              </div>
            </div>
          )}

          {/* 환불 사유 */}
          <div className="space-y-2">
            <Label htmlFor="reason">환불 사유 *</Label>
            <Textarea
              id="reason"
              placeholder="환불 사유를 입력해주세요 (고객 및 트레이너에게 전달됩니다)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleRefund}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                처리 중...
              </>
            ) : (
              '환불 진행'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
