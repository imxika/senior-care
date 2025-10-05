'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TimeSelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

// 30분 단위 시간 생성 (07:00 ~ 21:00)
const generateTimeSlots = () => {
  const slots: string[] = []
  for (let hour = 7; hour < 21; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`)
    slots.push(`${hour.toString().padStart(2, '0')}:30`)
  }
  // 21:00 추가
  slots.push('21:00')
  return slots
}

const TIME_SLOTS = generateTimeSlots()

export function TimeSelect({ value, onChange, disabled, className }: TimeSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="시간 선택" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {TIME_SLOTS.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
