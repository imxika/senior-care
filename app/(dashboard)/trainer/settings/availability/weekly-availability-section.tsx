'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Clock, Loader2, Zap } from 'lucide-react'
import { TimeSelect } from '@/components/time-select'
import { saveWeeklyAvailability, deleteWeeklyAvailability } from './actions'

interface TimeSlot {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
}

interface DaySchedule {
  enabled: boolean
  start_time: string
  end_time: string
  slots: TimeSlot[]
}

interface WeeklyAvailabilityProps {
  trainerId: string
  existingAvailabilities: {
    id: string
    day_of_week: number
    start_time: string
    end_time: string
  }[]
}

const DAYS_OF_WEEK = [
  { value: 1, label: '월요일' },
  { value: 2, label: '화요일' },
  { value: 3, label: '수요일' },
  { value: 4, label: '목요일' },
  { value: 5, label: '금요일' },
  { value: 6, label: '토요일' },
  { value: 0, label: '일요일' },
]

const PRESETS = [
  { label: '오전 (09:00-12:00)', start: '09:00', end: '12:00' },
  { label: '오후 (14:00-18:00)', start: '14:00', end: '18:00' },
  { label: '저녁 (18:00-21:00)', start: '18:00', end: '21:00' },
  { label: '종일 (09:00-18:00)', start: '09:00', end: '18:00' },
]

export function WeeklyAvailabilitySection({ trainerId, existingAvailabilities }: WeeklyAvailabilityProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // 요일별 스케줄 초기화
  const initSchedules = () => {
    const schedules: { [key: number]: DaySchedule } = {}

    DAYS_OF_WEEK.forEach(day => {
      const daySlots = existingAvailabilities.filter(a => a.day_of_week === day.value)

      schedules[day.value] = {
        enabled: daySlots.length > 0,
        start_time: daySlots[0]?.start_time || '09:00',
        end_time: daySlots[0]?.end_time || '18:00',
        slots: daySlots.map(a => ({
          id: a.id,
          day_of_week: a.day_of_week,
          start_time: a.start_time,
          end_time: a.end_time
        }))
      }
    })

    return schedules
  }

  const [schedules, setSchedules] = useState<{ [key: number]: DaySchedule }>(initSchedules())

  const toggleDay = (dayValue: number, enabled: boolean) => {
    setSchedules({
      ...schedules,
      [dayValue]: {
        ...schedules[dayValue],
        enabled
      }
    })
  }

  const updateTime = (dayValue: number, field: 'start_time' | 'end_time', value: string) => {
    setSchedules({
      ...schedules,
      [dayValue]: {
        ...schedules[dayValue],
        [field]: value
      }
    })
  }

  const applyToWeekdays = () => {
    const mondaySchedule = schedules[1]
    const newSchedules = { ...schedules }

    for (let i = 1; i <= 5; i++) {
      newSchedules[i] = {
        ...newSchedules[i],
        enabled: true,
        start_time: mondaySchedule.start_time,
        end_time: mondaySchedule.end_time
      }
    }

    setSchedules(newSchedules)
    toast.success('월요일 시간을 평일(월-금)에 적용했습니다')
  }

  const handleSave = async () => {
    setIsLoading(true)

    try {
      // 1. 기존 모든 시간대 삭제
      for (const schedule of Object.values(schedules)) {
        for (const slot of schedule.slots) {
          if (slot.id) {
            await deleteWeeklyAvailability(slot.id)
          }
        }
      }

      // 2. 활성화된 요일만 새로 생성
      const newSlots: TimeSlot[] = []

      Object.entries(schedules).forEach(([dayValue, schedule]) => {
        if (schedule.enabled) {
          newSlots.push({
            day_of_week: parseInt(dayValue),
            start_time: schedule.start_time,
            end_time: schedule.end_time
          })
        }
      })

      if (newSlots.length === 0) {
        toast.error('최소 1개 이상의 요일을 선택해주세요')
        setIsLoading(false)
        return
      }

      const result = await saveWeeklyAvailability(trainerId, newSlots)

      if (result.error) {
        toast.error('저장 실패', {
          description: result.error,
        })
        return
      }

      toast.success('기본 가능시간이 저장되었습니다')
      router.refresh()

    } catch (error) {
      console.error('Save error:', error)
      toast.error('오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              기본 가능시간 (요일별)
            </CardTitle>
            <CardDescription className="mt-1.5">
              예외 날짜를 설정하지 않은 경우 이 시간대로 예약이 가능합니다
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={applyToWeekdays}
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            월요일 → 평일 적용
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 빠른 프리셋 */}
        <div className="flex flex-wrap gap-2 pb-4 border-b">
          <span className="text-sm font-medium">빠른 설정:</span>
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                // 활성화된 모든 요일에 적용
                const newSchedules = { ...schedules }
                Object.keys(newSchedules).forEach(dayKey => {
                  if (newSchedules[parseInt(dayKey)].enabled) {
                    newSchedules[parseInt(dayKey)].start_time = preset.start
                    newSchedules[parseInt(dayKey)].end_time = preset.end
                  }
                })
                setSchedules(newSchedules)
                toast.success(`${preset.label} 적용됨`)
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {/* 요일별 설정 */}
        <div className="space-y-3">
          {DAYS_OF_WEEK.map(day => (
            <div key={day.value} className="flex items-center gap-4 p-3 border rounded-lg">
              <div className="flex items-center gap-3 min-w-[100px]">
                <Switch
                  checked={schedules[day.value]?.enabled}
                  onCheckedChange={(checked) => toggleDay(day.value, checked)}
                />
                <Label className="font-medium cursor-pointer" onClick={() => toggleDay(day.value, !schedules[day.value]?.enabled)}>
                  {day.label}
                </Label>
              </div>

              {schedules[day.value]?.enabled && (
                <div className="flex items-center gap-2 flex-1">
                  <TimeSelect
                    value={schedules[day.value].start_time}
                    onChange={(value) => updateTime(day.value, 'start_time', value)}
                    disabled={!schedules[day.value].enabled}
                  />
                  <span className="text-muted-foreground">~</span>
                  <TimeSelect
                    value={schedules[day.value].end_time}
                    onChange={(value) => updateTime(day.value, 'end_time', value)}
                    disabled={!schedules[day.value].enabled}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 저장 버튼 */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              '저장'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
