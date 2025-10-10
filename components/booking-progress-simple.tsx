'use client'

import React from 'react'
import { Check, Clock, UserCheck, Calendar, CheckCircle2, XCircle, Users, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BookingProgressSimpleProps {
  bookingType: 'direct' | 'recommended'
  currentStatus: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  hasTrainer: boolean
  scheduledDate?: string
  scheduledTime?: string
  participantsCount?: number
}

export function BookingProgressSimple({
  bookingType,
  currentStatus,
  hasTrainer,
  scheduledDate,
  scheduledTime,
  participantsCount
}: BookingProgressSimpleProps) {

  // 현재 상태 정보
  const getCurrentStep = () => {
    if (currentStatus === 'cancelled' || currentStatus === 'no_show') {
      return {
        icon: <XCircle className="h-6 w-6" />,
        title: currentStatus === 'cancelled' ? '예약 취소됨' : '노쇼',
        description: '예약이 취소되었습니다',
        color: 'red'
      }
    }

    if (currentStatus === 'completed') {
      return {
        icon: <CheckCircle2 className="h-6 w-6" />,
        title: '서비스 완료',
        description: '운동 지도가 완료되었습니다',
        color: 'green'
      }
    }

    if (bookingType === 'recommended') {
      if (!hasTrainer) {
        return {
          icon: <UserCheck className="h-6 w-6" />,
          title: '트레이너 매칭 중',
          description: '최적의 트레이너를 찾고 있습니다',
          color: 'blue'
        }
      }
      if (currentStatus === 'pending') {
        return {
          icon: <Clock className="h-6 w-6" />,
          title: '트레이너 승인 대기',
          description: '트레이너의 승인을 기다리는 중입니다',
          color: 'yellow'
        }
      }
      if (currentStatus === 'confirmed' || currentStatus === 'in_progress') {
        return {
          icon: <Calendar className="h-6 w-6" />,
          title: '예약 확정',
          description: '예약이 확정되었습니다',
          color: 'green'
        }
      }
    } else {
      // direct
      if (currentStatus === 'pending') {
        return {
          icon: <Clock className="h-6 w-6" />,
          title: '트레이너 승인 대기',
          description: '트레이너의 승인을 기다리는 중입니다',
          color: 'yellow'
        }
      }
      if (currentStatus === 'confirmed' || currentStatus === 'in_progress') {
        return {
          icon: <Calendar className="h-6 w-6" />,
          title: '예약 확정',
          description: '예약이 확정되었습니다',
          color: 'green'
        }
      }
    }

    return {
      icon: <Check className="h-6 w-6" />,
      title: '예약 접수',
      description: '예약이 접수되었습니다',
      color: 'blue'
    }
  }

  const step = getCurrentStep()

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red':
        return {
          icon: 'bg-red-500 border-red-500 text-white',
          title: 'text-red-700',
          border: 'border-red-200',
          bg: 'bg-red-50/50'
        }
      case 'green':
        return {
          icon: 'bg-green-500 border-green-500 text-white',
          title: 'text-green-700',
          border: 'border-green-200',
          bg: 'bg-green-50/50'
        }
      case 'yellow':
        return {
          icon: 'bg-yellow-500 border-yellow-500 text-white animate-pulse',
          title: 'text-yellow-700',
          border: 'border-yellow-200',
          bg: 'bg-yellow-50/50'
        }
      case 'blue':
      default:
        return {
          icon: 'bg-blue-500 border-blue-500 text-white animate-pulse',
          title: 'text-blue-700',
          border: 'border-blue-200',
          bg: 'bg-blue-50/50'
        }
    }
  }

  const colors = getColorClasses(step.color)

  // Progress steps for the bar
  const getProgressSteps = () => {
    if (bookingType === 'recommended') {
      const matchingStatus: 'cancelled' | 'completed' | 'current' =
        currentStatus === 'cancelled' ? 'cancelled' : hasTrainer ? 'completed' : 'current';

      return [
        {
          label: '예약\n접수',
          description: '예약이 접수되었습니다',
          icon: <Check className="h-5 w-5" />,
          status: 'completed' as const
        },
        {
          label: '트레이너\n매칭',
          description: hasTrainer ? '매칭이 완료되었습니다' : '최적의 트레이너를 찾는 중입니다',
          icon: <UserCheck className="h-5 w-5" />,
          status: matchingStatus
        },
        {
          label: '트레이너\n승인',
          description: currentStatus === 'confirmed' || currentStatus === 'in_progress' || currentStatus === 'completed'
            ? '트레이너가 승인했습니다'
            : hasTrainer
            ? '트레이너 승인을 기다리는 중입니다'
            : '매칭 후 진행됩니다',
          icon: <Clock className="h-5 w-5" />,
          status: (() => {
            if (currentStatus === 'cancelled') return 'cancelled' as const;
            if (currentStatus === 'confirmed' || currentStatus === 'in_progress' || currentStatus === 'completed') return 'completed' as const;
            if (hasTrainer) return 'current' as const;
            return 'upcoming' as const;
          })()
        },
        {
          label: '예약\n확정',
          description: currentStatus === 'confirmed' || currentStatus === 'in_progress'
            ? '예약이 확정되었습니다'
            : currentStatus === 'completed'
            ? '예약이 확정되었습니다'
            : '승인 후 확정됩니다',
          icon: <Calendar className="h-5 w-5" />,
          status: (() => {
            if (currentStatus === 'cancelled') return 'cancelled' as const;
            if (currentStatus === 'completed') return 'completed' as const;
            if (currentStatus === 'confirmed' || currentStatus === 'in_progress') return 'current' as const;
            return 'upcoming' as const;
          })()
        },
        {
          label: '서비스\n완료',
          description: currentStatus === 'completed' ? '서비스가 완료되었습니다' : '예정된 날짜에 진행됩니다',
          icon: <CheckCircle2 className="h-5 w-5" />,
          status: (() => {
            if (currentStatus === 'cancelled') return 'cancelled' as const;
            if (currentStatus === 'completed') return 'completed' as const;
            return 'upcoming' as const;
          })()
        }
      ]
    } else {
      return [
        {
          label: '예약\n요청',
          description: '트레이너에게 예약을 요청했습니다',
          icon: <Check className="h-5 w-5" />,
          status: 'completed' as const
        },
        {
          label: '트레이너\n승인',
          description: currentStatus === 'confirmed' || currentStatus === 'in_progress' || currentStatus === 'completed'
            ? '트레이너가 승인했습니다'
            : '트레이너 승인을 기다리는 중입니다',
          icon: <Clock className="h-5 w-5" />,
          status: (() => {
            if (currentStatus === 'cancelled') return 'cancelled' as const;
            if (currentStatus === 'confirmed' || currentStatus === 'in_progress' || currentStatus === 'completed') return 'completed' as const;
            return 'current' as const;
          })()
        },
        {
          label: '예약\n확정',
          description: currentStatus === 'confirmed' || currentStatus === 'in_progress'
            ? '예약이 확정되었습니다'
            : currentStatus === 'completed'
            ? '예약이 확정되었습니다'
            : '승인 후 확정됩니다',
          icon: <Calendar className="h-5 w-5" />,
          status: (() => {
            if (currentStatus === 'cancelled') return 'cancelled' as const;
            if (currentStatus === 'completed') return 'completed' as const;
            if (currentStatus === 'confirmed' || currentStatus === 'in_progress') return 'current' as const;
            return 'upcoming' as const;
          })()
        },
        {
          label: '서비스\n완료',
          description: currentStatus === 'completed' ? '서비스가 완료되었습니다' : '예정된 날짜에 진행됩니다',
          icon: <CheckCircle2 className="h-5 w-5" />,
          status: (() => {
            if (currentStatus === 'cancelled') return 'cancelled' as const;
            if (currentStatus === 'completed') return 'completed' as const;
            return 'upcoming' as const;
          })()
        }
      ]
    }
  }

  const steps = getProgressSteps()

  return (
    <div className="space-y-4 py-4 md:py-6 bg-gray-50/50 rounded-lg">
      {/* Progress Bar */}
      {currentStatus !== 'cancelled' && currentStatus !== 'no_show' && (
        <div className="relative">
          <div className="flex items-start justify-between gap-2 md:gap-4 relative">
              {/* Progress Line - Horizontal - centered through icons */}
              {/* size-9 = 36px, center = 18px for mobile */}
              {/* size-11 = 44px, center = 22px for desktop */}
              <div
                className="absolute h-0.5 bg-gray-200 top-[18px] md:top-[22px]"
                style={{
                  left: `calc((100% / ${steps.length}) / 2)`,
                  right: `calc((100% / ${steps.length}) / 2)`
                }}
              />

              {steps.map((s, idx) => (
                <div key={idx} className="relative flex flex-col items-center flex-1">
                  {/* Icon */}
                  <div className={cn(
                    "relative z-10 flex items-center justify-center rounded-full border-2 transition-all duration-300 shrink-0 aspect-square",
                    "size-9 md:size-11",
                    s.status === 'completed' && "bg-green-500 border-green-500 text-white",
                    s.status === 'current' && "bg-blue-500 border-blue-500 text-white animate-pulse",
                    s.status === 'cancelled' && "bg-red-500 border-red-500 text-white",
                    s.status === 'upcoming' && "bg-gray-100 border-gray-300 text-gray-400"
                  )}>
                    {s.status === 'cancelled' ? (
                      <XCircle className="size-4 md:size-4 shrink-0" />
                    ) : (
                      React.cloneElement(s.icon as React.ReactElement<{ className?: string }>, { className: "size-4 md:size-4 shrink-0" })
                    )}
                  </div>

                  {/* Label & Description */}
                  <div className="mt-2 md:mt-4 text-center w-full px-0.5">
                    <h4 className={cn(
                      "font-semibold transition-colors text-sm md:text-base leading-tight whitespace-pre-line",
                      s.status === 'completed' && "text-green-700",
                      s.status === 'current' && "text-blue-700",
                      s.status === 'cancelled' && "text-red-700",
                      s.status === 'upcoming' && "text-gray-500"
                    )}>
                      {s.label}
                    </h4>
                    <p className={cn(
                      "text-[10px] md:text-xs mt-1 transition-colors leading-tight hidden md:block",
                      s.status === 'upcoming' && "text-gray-400",
                      s.status !== 'upcoming' && "text-gray-600"
                    )}>
                      {s.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* 예약 정보 - 컴팩트 한 줄 */}
      <div className="flex items-center justify-center gap-3 pt-3 text-sm md:text-base text-muted-foreground">
        {/* 예약 타입 */}
        <div className="flex items-center gap-1.5">
          <Target className="h-4 w-4 shrink-0" />
          <span className="font-medium text-foreground">
            {bookingType === 'recommended' ? '추천' : '지정'}
          </span>
        </div>

        {/* 구분선 */}
        <span className="text-muted-foreground/50">|</span>

        {/* 세션 유형 */}
        {participantsCount && (
          <>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 shrink-0" />
              <span className="font-medium text-foreground">
                1:{participantsCount}
              </span>
            </div>

            {/* 구분선 */}
            <span className="text-muted-foreground/50">|</span>
          </>
        )}

        {/* 예정일시 */}
        {scheduledDate && scheduledTime && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="font-medium text-foreground">
              {scheduledDate} {scheduledTime.slice(0, 5)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
