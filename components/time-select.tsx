'use client'

import { useState, useEffect } from 'react'
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

export function TimeSelect({ value, onChange, disabled, className }: TimeSelectProps) {
  const [mounted, setMounted] = useState(false)
  const [timeSlots, setTimeSlots] = useState<string[]>([])

  useEffect(() => {
    setTimeSlots(generateTimeSlots())
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Select value={value} disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder={value} />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="시간 선택" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px] z-[9999]" position="popper" sideOffset={4}>
        {timeSlots.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
