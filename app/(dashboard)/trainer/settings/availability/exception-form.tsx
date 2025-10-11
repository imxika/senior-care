'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, Plus, Trash2 } from 'lucide-react'

interface TimeSlot {
  start: string
  end: string
}

interface ExceptionFormProps {
  onSubmit: (data: {
    date: string
    isAvailable: boolean
    timeSlots?: string[]
    reason?: string
  }) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

export function ExceptionForm({ onSubmit, onCancel, isSubmitting }: ExceptionFormProps) {
  const [date, setDate] = useState('')
  const [exceptionType, setExceptionType] = useState<'closed' | 'custom'>('custom')
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([{ start: '09', end: '12' }])
  const [reason, setReason] = useState('')

  // 시간 옵션 생성 (0시~23시)
  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0')
    return { value: hour, label: `${i}시` }
  })

  const handleAddTimeSlot = () => {
    setTimeSlots([...timeSlots, { start: '09', end: '12' }])
  }

  const handleRemoveTimeSlot = (index: number) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter((_, i) => i !== index))
    }
  }

  const handleTimeChange = (index: number, field: 'start' | 'end', value: string) => {
    const newSlots = [...timeSlots]
    newSlots[index][field] = value
    setTimeSlots(newSlots)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!date) {
      return
    }

    // 시간 슬롯을 "HH:00-HH:00" 형식으로 변환
    const formattedSlots = exceptionType === 'custom'
      ? timeSlots.map(slot => `${slot.start}:00-${slot.end}:00`)
      : undefined

    await onSubmit({
      date,
      isAvailable: exceptionType === 'custom',
      timeSlots: formattedSlots,
      reason: reason || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 bg-muted/30 space-y-4">
      {/* 날짜 선택 */}
      <div className="space-y-2">
        <Label htmlFor="date">
          📅 날짜 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          required
          className="max-w-xs"
        />
      </div>

      {/* 예외 타입 선택 */}
      <div className="space-y-3">
        <Label>🔘 이 날짜는...</Label>
        <RadioGroup value={exceptionType} onValueChange={(value: 'closed' | 'custom') => setExceptionType(value)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="closed" id="closed" />
            <Label htmlFor="closed" className="font-normal cursor-pointer">
              완전 휴무 (예약 불가)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="custom" />
            <Label htmlFor="custom" className="font-normal cursor-pointer">
              다른 시간대 적용
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* 시간대 설정 (custom인 경우만) */}
      {exceptionType === 'custom' && (
        <div className="space-y-3">
          <Label>⏰ 가능 시간 (시간 단위)</Label>
          <div className="space-y-2">
            {timeSlots.map((slot, index) => (
              <div key={index} className="flex items-center gap-2">
                <select
                  value={slot.start}
                  onChange={(e) => handleTimeChange(index, 'start', e.target.value)}
                  className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {hourOptions.map(hour => (
                    <option key={hour.value} value={hour.value}>{hour.label}</option>
                  ))}
                </select>
                <span className="text-muted-foreground">~</span>
                <select
                  value={slot.end}
                  onChange={(e) => handleTimeChange(index, 'end', e.target.value)}
                  className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {hourOptions.map(hour => (
                    <option key={hour.value} value={hour.value}>{hour.label}</option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">시</span>
                {timeSlots.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTimeSlot(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddTimeSlot}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              시간대 추가
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            💡 예: 오전 9시~12시, 오후 2시~5시 등 여러 시간대 설정 가능
          </p>
        </div>
      )}

      {/* 사유 */}
      <div className="space-y-2">
        <Label htmlFor="reason">📝 사유 (선택)</Label>
        <Textarea
          id="reason"
          placeholder="예: 개인 일정, 워크샵 참석, 병원 방문"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          사유를 기록하면 나중에 확인하기 편리합니다
        </p>
      </div>

      {/* 버튼 */}
      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          취소
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            '저장'
          )}
        </Button>
      </div>
    </form>
  )
}
