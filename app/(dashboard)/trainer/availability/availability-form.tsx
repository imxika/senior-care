'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { TimeSelect } from '@/components/time-select'
import { toast } from 'sonner'
import { Clock, Calendar, Zap } from 'lucide-react'
import { saveAvailability, deleteAvailability } from './actions'

interface TimeSlot {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
}

interface AvailabilityFormProps {
  trainerId: string
  existingAvailabilities: {
    id: string
    day_of_week: number
    start_time: string
    end_time: string
  }[]
  daysOfWeek: { value: number; label: string }[]
}

interface DaySchedule {
  enabled: boolean
  start_time: string
  end_time: string
  slots: TimeSlot[]
}

// 빠른 프리셋
const PRESETS = [
  { label: '오전 (09:00-12:00)', start: '09:00', end: '12:00' },
  { label: '오후 (14:00-18:00)', start: '14:00', end: '18:00' },
  { label: '저녁 (18:00-21:00)', start: '18:00', end: '21:00' },
  { label: '종일 (09:00-18:00)', start: '09:00', end: '18:00' },
]

export function AvailabilityForm({
  trainerId,
  existingAvailabilities,
  daysOfWeek
}: AvailabilityFormProps) {
  // 요일별 스케줄 초기화
  const initSchedules = () => {
    const schedules: { [key: number]: DaySchedule } = {}

    daysOfWeek.forEach(day => {
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
  const [isLoading, setIsLoading] = useState(false)

  // 요일 토글
  const toggleDay = (dayValue: number, enabled: boolean) => {
    setSchedules({
      ...schedules,
      [dayValue]: {
        ...schedules[dayValue],
        enabled
      }
    })
  }

  // 시간 업데이트
  const updateTime = (dayValue: number, field: 'start_time' | 'end_time', value: string) => {
    setSchedules({
      ...schedules,
      [dayValue]: {
        ...schedules[dayValue],
        [field]: value
      }
    })
  }

  // 프리셋 적용
  const applyPreset = (dayValue: number, preset: typeof PRESETS[0]) => {
    setSchedules({
      ...schedules,
      [dayValue]: {
        ...schedules[dayValue],
        start_time: preset.start,
        end_time: preset.end
      }
    })
  }

  // 모든 평일에 동일 시간 적용
  const applyToWeekdays = () => {
    const weekdaySchedule = schedules[1] // 월요일 기준
    const newSchedules = { ...schedules }

    // 월-금 (1-5)
    for (let i = 1; i <= 5; i++) {
      newSchedules[i] = {
        ...newSchedules[i],
        enabled: true,
        start_time: weekdaySchedule.start_time,
        end_time: weekdaySchedule.end_time
      }
    }

    setSchedules(newSchedules)
    toast.success('적용 완료', {
      description: '월요일 시간을 평일(월-금)에 적용했습니다.'
    })
  }

  // 저장
  const handleSave = async () => {
    setIsLoading(true)

    try {
      // 1. 기존 모든 시간대 삭제
      for (const schedule of Object.values(schedules)) {
        for (const slot of schedule.slots) {
          if (slot.id) {
            await deleteAvailability(slot.id)
          }
        }
      }

      // 2. 활성화된 요일만 새로 생성
      const newSlots: TimeSlot[] = []

      Object.entries(schedules).forEach(([dayValue, schedule]) => {
        if (schedule.enabled) {
          // 시간 유효성 검사
          if (schedule.start_time >= schedule.end_time) {
            throw new Error(`${daysOfWeek[Number(dayValue)].label}: 종료 시간이 시작 시간보다 늦어야 합니다.`)
          }

          newSlots.push({
            day_of_week: Number(dayValue),
            start_time: schedule.start_time,
            end_time: schedule.end_time
          })
        }
      })

      if (newSlots.length === 0) {
        toast.error('저장 실패', {
          description: '최소 1개 이상의 가능 시간을 설정해주세요.'
        })
        setIsLoading(false)
        return
      }

      // 3. 저장
      const result = await saveAvailability(trainerId, newSlots)

      if (result.error) {
        toast.error('저장 실패', {
          description: result.error
        })
      } else {
        toast.success('저장 완료', {
          description: `${newSlots.length}개 요일의 가능 시간이 저장되었습니다.`
        })

        // 저장된 데이터로 상태 업데이트
        if (result.data) {
          const newSchedules = initSchedules()
          result.data.forEach(slot => {
            newSchedules[slot.day_of_week] = {
              enabled: true,
              start_time: slot.start_time,
              end_time: slot.end_time,
              slots: [slot]
            }
          })
          setSchedules(newSchedules)
        }
      }
    } catch (error) {
      toast.error('오류 발생', {
        description: error instanceof Error ? error.message : '저장에 실패했습니다.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const enabledCount = Object.values(schedules).filter(s => s.enabled).length

  return (
    <div className="space-y-6">
      {/* 상단 요약 및 빠른 설정 - 2컬럼 */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* 요약 카드 */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-900 text-lg">
              <Calendar className="w-5 h-5" />
              가능 시간 요약
            </CardTitle>
            <CardDescription className="text-blue-700">
              {enabledCount > 0
                ? `${enabledCount}개 요일 운동 지도 가능`
                : '요일을 선택해주세요'}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* 빠른 설정 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-yellow-500" />
              빠른 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              onClick={applyToWeekdays}
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isLoading}
            >
              <Calendar className="w-4 h-4 mr-2" />
              월요일 → 평일 적용
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 요일별 설정 - 4컬럼 그리드 (데스크탑) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {daysOfWeek.map(day => {
          const schedule = schedules[day.value]
          const isWeekend = day.value === 0 || day.value === 6

          return (
            <Card
              key={day.value}
              className={schedule.enabled ? 'border-green-200 bg-green-50/30' : ''}
            >
              <CardHeader className="pb-2 px-3 pt-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={schedule.enabled}
                      onCheckedChange={(checked) => toggleDay(day.value, checked)}
                      disabled={isLoading}
                    />
                    <span className={`text-sm font-semibold ${isWeekend ? 'text-red-600' : ''}`}>
                      {day.label}
                    </span>
                  </div>
                  {schedule.enabled && (
                    <div className="text-xs font-medium text-green-600 pl-10">
                      {schedule.start_time} - {schedule.end_time}
                    </div>
                  )}
                </div>
              </CardHeader>

              {schedule.enabled && (
                <CardContent className="space-y-2 pt-0 px-3 pb-3">
                  {/* 시간 선택 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs w-10 text-muted-foreground">시작</Label>
                      <TimeSelect
                        value={schedule.start_time}
                        onChange={(value) => updateTime(day.value, 'start_time', value)}
                        disabled={isLoading}
                        className="flex-1 h-7 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs w-10 text-muted-foreground">종료</Label>
                      <TimeSelect
                        value={schedule.end_time}
                        onChange={(value) => updateTime(day.value, 'end_time', value)}
                        disabled={isLoading}
                        className="flex-1 h-7 text-xs"
                      />
                    </div>
                  </div>

                  {/* 프리셋 버튼 - 2x2 그리드 */}
                  <div className="grid grid-cols-2 gap-1">
                    {PRESETS.map(preset => (
                      <Button
                        key={preset.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreset(day.value, preset)}
                        disabled={isLoading}
                        className="h-6 text-[10px] px-1.5 py-0"
                      >
                        {preset.label.split(' (')[0]}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end gap-3 sticky bottom-4 bg-background p-4 border rounded-lg shadow-lg">
        <Button
          variant="outline"
          onClick={() => setSchedules(initSchedules())}
          disabled={isLoading}
        >
          초기화
        </Button>
        <Button
          onClick={handleSave}
          disabled={isLoading || enabledCount === 0}
          size="lg"
          className="min-w-[120px]"
        >
          {isLoading ? '저장 중...' : `저장 (${enabledCount}개)`}
        </Button>
      </div>
    </div>
  )
}
