'use client'

import { Check, Clock, UserCheck, Calendar, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface BookingProgressSimpleProps {
  bookingType: 'direct' | 'recommended'
  currentStatus: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  hasTrainer: boolean
  serviceType?: string
  trainerName?: string
  scheduledDate?: string
  scheduledTime?: string
}

export function BookingProgressSimple({
  bookingType,
  currentStatus,
  hasTrainer,
  serviceType,
  scheduledDate,
  scheduledTime
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
      return [
        {
          label: '예약 접수',
          description: '예약이 접수되었습니다',
          icon: <Check className="h-5 w-5" />,
          status: 'completed' as const
        },
        {
          label: '트레이너 매칭',
          description: hasTrainer ? '매칭이 완료되었습니다' : '최적의 트레이너를 찾는 중입니다',
          icon: <UserCheck className="h-5 w-5" />,
          status: (currentStatus === 'cancelled' ? 'cancelled' : hasTrainer ? 'completed' : 'current') as const
        },
        {
          label: '트레이너 승인',
          description: currentStatus === 'confirmed' || currentStatus === 'in_progress' || currentStatus === 'completed'
            ? '트레이너가 승인했습니다'
            : hasTrainer
            ? '트레이너 승인을 기다리는 중입니다'
            : '매칭 후 진행됩니다',
          icon: <Clock className="h-5 w-5" />,
          status: (
            currentStatus === 'cancelled' ? 'cancelled' :
            currentStatus === 'confirmed' || currentStatus === 'in_progress' || currentStatus === 'completed' ? 'completed' :
            hasTrainer ? 'current' : 'upcoming'
          ) as const
        },
        {
          label: '예약 확정',
          description: currentStatus === 'confirmed' || currentStatus === 'in_progress'
            ? '예약이 확정되었습니다'
            : currentStatus === 'completed'
            ? '예약이 확정되었습니다'
            : '승인 후 확정됩니다',
          icon: <Calendar className="h-5 w-5" />,
          status: (
            currentStatus === 'cancelled' ? 'cancelled' :
            currentStatus === 'completed' ? 'completed' :
            currentStatus === 'confirmed' || currentStatus === 'in_progress' ? 'current' : 'upcoming'
          ) as const
        },
        {
          label: '서비스 완료',
          description: currentStatus === 'completed' ? '서비스가 완료되었습니다' : '예정된 날짜에 진행됩니다',
          icon: <CheckCircle2 className="h-5 w-5" />,
          status: (
            currentStatus === 'cancelled' ? 'cancelled' :
            currentStatus === 'completed' ? 'completed' : 'upcoming'
          ) as const
        }
      ]
    } else {
      return [
        {
          label: '예약 요청',
          description: '트레이너에게 예약을 요청했습니다',
          icon: <Check className="h-5 w-5" />,
          status: 'completed' as const
        },
        {
          label: '트레이너 승인',
          description: currentStatus === 'confirmed' || currentStatus === 'in_progress' || currentStatus === 'completed'
            ? '트레이너가 승인했습니다'
            : '트레이너 승인을 기다리는 중입니다',
          icon: <Clock className="h-5 w-5" />,
          status: (
            currentStatus === 'cancelled' ? 'cancelled' :
            currentStatus === 'confirmed' || currentStatus === 'in_progress' || currentStatus === 'completed' ? 'completed' :
            'current'
          ) as const
        },
        {
          label: '예약 확정',
          description: currentStatus === 'confirmed' || currentStatus === 'in_progress'
            ? '예약이 확정되었습니다'
            : currentStatus === 'completed'
            ? '예약이 확정되었습니다'
            : '승인 후 확정됩니다',
          icon: <Calendar className="h-5 w-5" />,
          status: (
            currentStatus === 'cancelled' ? 'cancelled' :
            currentStatus === 'completed' ? 'completed' :
            currentStatus === 'confirmed' || currentStatus === 'in_progress' ? 'current' :
            'upcoming'
          ) as const
        },
        {
          label: '서비스 완료',
          description: currentStatus === 'completed' ? '서비스가 완료되었습니다' : '예정된 날짜에 진행됩니다',
          icon: <CheckCircle2 className="h-5 w-5" />,
          status: (
            currentStatus === 'cancelled' ? 'cancelled' :
            currentStatus === 'completed' ? 'completed' : 'upcoming'
          ) as const
        }
      ]
    }
  }

  const steps = getProgressSteps()

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Progress Bar */}
        {currentStatus !== 'cancelled' && currentStatus !== 'no_show' && (
          <div className="relative">
            <div className="flex items-start justify-between gap-4 relative">
              {/* Progress Line - Horizontal */}
              <div
                className="absolute top-6 h-0.5 bg-gray-200"
                style={{
                  left: `calc((100% / ${steps.length}) / 2)`,
                  right: `calc((100% / ${steps.length}) / 2)`
                }}
              />

              {steps.map((s, idx) => (
                <div key={idx} className="relative flex flex-col items-center flex-1 min-w-0">
                  {/* Icon */}
                  <div className={cn(
                    "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300 flex-shrink-0",
                    s.status === 'completed' && "bg-green-500 border-green-500 text-white",
                    s.status === 'current' && "bg-blue-500 border-blue-500 text-white animate-pulse",
                    s.status === 'cancelled' && "bg-red-500 border-red-500 text-white",
                    s.status === 'upcoming' && "bg-gray-100 border-gray-300 text-gray-400"
                  )}>
                    {s.status === 'cancelled' ? <XCircle className="h-5 w-5" /> : s.icon}
                  </div>

                  {/* Label & Description */}
                  <div className="mt-4 text-center w-full">
                    <h4 className={cn(
                      "font-semibold transition-colors text-sm",
                      s.status === 'completed' && "text-green-700",
                      s.status === 'current' && "text-blue-700",
                      s.status === 'cancelled' && "text-red-700",
                      s.status === 'upcoming' && "text-gray-500"
                    )}>
                      {s.label}
                    </h4>
                    <p className={cn(
                      "text-xs mt-1 transition-colors",
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

        {/* 예약 정보 */}
        <div className="text-sm space-y-1">
          {serviceType && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">서비스:</span>
              <span className="font-medium">{serviceType}</span>
            </div>
          )}
          {scheduledDate && scheduledTime && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">예정일시:</span>
              <span className="font-medium">{scheduledDate} {scheduledTime}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
