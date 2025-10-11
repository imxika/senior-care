'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Calendar, Loader2, Plus, Trash2, AlertCircle } from 'lucide-react'
import { toggleTrainerAvailability, upsertAvailabilityException, deleteAvailabilityException } from './actions'
import { WeeklyAvailabilitySection } from './weekly-availability-section'
import { ExceptionForm } from './exception-form'

interface Trainer {
  id: string
  is_available: boolean
  availability: Record<string, string[]> | null
}

interface Availability {
  id: string
  trainer_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

interface Exception {
  id: string
  trainer_id: string
  date: string
  is_available: boolean
  time_slots: string[] | null
  reason: string | null
  created_at: string
}

interface AvailabilityContentProps {
  trainer: Trainer
  availabilities: Availability[]
  exceptions: Exception[]
}

export function AvailabilityContent({ trainer, availabilities, exceptions }: AvailabilityContentProps) {
  const router = useRouter()
  const [isToggling, setIsToggling] = useState(false)
  const [isAddingException, setIsAddingException] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleToggleAvailability = async () => {
    setIsToggling(true)

    try {
      const result = await toggleTrainerAvailability(trainer.id, !trainer.is_available)

      if (result.error) {
        toast.error('활성화 상태 변경 실패', {
          description: result.error,
        })
        return
      }

      toast.success(
        trainer.is_available ? '비활성화되었습니다' : '활성화되었습니다',
        {
          description: trainer.is_available
            ? '검색 및 예약이 중단됩니다'
            : '다시 검색 및 예약이 가능합니다',
        }
      )

      router.refresh()
    } catch (error) {
      console.error('Toggle availability error:', error)
      toast.error('오류가 발생했습니다')
    } finally {
      setIsToggling(false)
    }
  }

  const handleSubmitException = async (data: {
    date: string
    isAvailable: boolean
    timeSlots?: string[]
    reason?: string
  }) => {
    setIsSubmitting(true)

    try {
      const result = await upsertAvailabilityException({
        trainerId: trainer.id,
        date: data.date,
        isAvailable: data.isAvailable,
        timeSlots: data.timeSlots,
        reason: data.reason,
      })

      if (result.error) {
        toast.error('예외 설정 실패', {
          description: result.error,
        })
        return
      }

      toast.success('예외가 설정되었습니다')
      setIsAddingException(false)
      router.refresh()
    } catch (error) {
      console.error('Submit exception error:', error)
      toast.error('오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteException = async (exceptionId: string) => {
    if (!confirm('이 예외를 삭제하시겠습니까?')) {
      return
    }

    setIsDeletingId(exceptionId)

    try {
      const result = await deleteAvailabilityException(exceptionId)

      if (result.error) {
        toast.error('예외 삭제 실패', {
          description: result.error,
        })
        return
      }

      toast.success('예외가 삭제되었습니다')
      router.refresh()
    } catch (error) {
      console.error('Delete exception error:', error)
      toast.error('오류가 발생했습니다')
    } finally {
      setIsDeletingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekday = weekdays[date.getDay()]
    return `${month}월 ${day}일 (${weekday})`
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* 제목 */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">가능시간 관리</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          활성화 상태 및 날짜별 가능시간을 관리하세요
        </p>
      </div>

      {/* 활성화/비활성화 토글 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            활성화 상태
          </CardTitle>
          <CardDescription>
            비활성화하면 고객 검색 및 신규 예약이 중단됩니다. 기존 예약은 유지됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <span>현재 상태:</span>
                <Badge variant={trainer.is_available ? 'default' : 'secondary'}>
                  {trainer.is_available ? '✅ 활성화' : '⏸️ 비활성화'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {trainer.is_available
                  ? '고객이 검색 및 예약을 할 수 있습니다'
                  : '고객이 검색 및 예약을 할 수 없습니다'}
              </p>
            </div>
            <Switch
              checked={trainer.is_available}
              onCheckedChange={handleToggleAvailability}
              disabled={isToggling}
            />
          </div>
        </CardContent>
      </Card>

      {/* 기본 가능시간 설정 */}
      <WeeklyAvailabilitySection
        trainerId={trainer.id}
        existingAvailabilities={availabilities}
      />

      {/* 날짜별 예외 설정 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                날짜별 예외 설정
              </CardTitle>
              <CardDescription className="mt-1.5">
                특정 날짜에 다른 시간대로 예약을 받거나 휴무 처리할 수 있습니다
              </CardDescription>
            </div>
            {!isAddingException && (
              <Button onClick={() => setIsAddingException(true)} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                예외 추가
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 예외 추가 폼 */}
          {isAddingException && (
            <ExceptionForm
              onSubmit={handleSubmitException}
              onCancel={() => setIsAddingException(false)}
              isSubmitting={isSubmitting}
            />
          )}

          {/* 예외 목록 */}
          {exceptions.length > 0 ? (
            <div className="space-y-2">
              {exceptions.map((exception) => (
                <div
                  key={exception.id}
                  className="border rounded-lg p-3 flex items-start justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{formatDate(exception.date)}</p>
                      <Badge variant={exception.is_available ? 'default' : 'secondary'} className="text-xs">
                        {exception.is_available ? '예약 가능' : '휴무'}
                      </Badge>
                    </div>
                    {exception.is_available && exception.time_slots && (
                      <p className="text-sm text-muted-foreground">
                        시간: {exception.time_slots.join(', ')}
                      </p>
                    )}
                    {exception.reason && (
                      <p className="text-sm text-muted-foreground">사유: {exception.reason}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteException(exception.id)}
                    disabled={isDeletingId !== null}
                  >
                    {isDeletingId === exception.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            !isAddingException && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">설정된 예외가 없습니다</p>
                <p className="text-xs mt-1">특정 날짜에 다른 시간대를 적용하려면 예외를 추가하세요</p>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}
