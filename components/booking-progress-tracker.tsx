'use client'

import { Check, Clock, UserCheck, Calendar, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  status: 'completed' | 'current' | 'upcoming' | 'cancelled'
}

interface BookingProgressTrackerProps {
  bookingType: 'direct' | 'recommended'
  currentStatus: 'pending_payment' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'expired'
  hasTrainer: boolean
  createdAt: string
  trainerMatchedAt?: string | null
  trainerConfirmedAt?: string | null
  serviceStartedAt?: string | null
  serviceCompletedAt?: string | null
}

export function BookingProgressTracker({
  bookingType,
  currentStatus,
  hasTrainer,
  createdAt,
  trainerMatchedAt,
  trainerConfirmedAt,
  serviceStartedAt,
  serviceCompletedAt
}: BookingProgressTrackerProps) {

  // expired 상태는 트래커 숨김 (이미 위에 만료 메시지 표시됨)
  if (currentStatus === 'expired' || currentStatus === 'pending_payment') {
    return null
  }

  // 추천 예약 단계
  const recommendedSteps: Step[] = [
    {
      id: 'requested',
      title: '예약 접수',
      description: '예약이 접수되었습니다',
      icon: <Check className="h-5 w-5" />,
      status: 'completed'
    },
    {
      id: 'matching',
      title: '트레이너 매칭',
      description: hasTrainer ? '매칭이 완료되었습니다' : '최적의 트레이너를 찾는 중입니다',
      icon: <UserCheck className="h-5 w-5" />,
      status: currentStatus === 'cancelled' ? 'cancelled' : hasTrainer ? 'completed' : 'current'
    },
    {
      id: 'waiting_approval',
      title: '트레이너 승인 대기',
      description: currentStatus === 'confirmed' ? '트레이너가 승인했습니다' :
                   currentStatus === 'cancelled' ? '트레이너가 거절했습니다' :
                   hasTrainer ? '트레이너 승인을 기다리는 중입니다' : '매칭 후 진행됩니다',
      icon: <Clock className="h-5 w-5" />,
      status: currentStatus === 'cancelled' ? 'cancelled' :
              currentStatus === 'confirmed' || currentStatus === 'in_progress' || currentStatus === 'completed' ? 'completed' :
              hasTrainer ? 'current' : 'upcoming'
    },
    {
      id: 'confirmed',
      title: '예약 확정',
      description: currentStatus === 'completed' ? '서비스가 완료되었습니다' :
                   currentStatus === 'confirmed' || currentStatus === 'in_progress' ? '예약이 확정되었습니다' :
                   '승인 후 확정됩니다',
      icon: <Calendar className="h-5 w-5" />,
      status: currentStatus === 'cancelled' ? 'cancelled' :
              currentStatus === 'completed' ? 'completed' :
              currentStatus === 'confirmed' || currentStatus === 'in_progress' ? 'current' : 'upcoming'
    },
    {
      id: 'completed',
      title: '서비스 완료',
      description: currentStatus === 'completed' ? '서비스가 완료되었습니다' : '예정된 날짜에 진행됩니다',
      icon: <CheckCircle2 className="h-5 w-5" />,
      status: currentStatus === 'cancelled' ? 'cancelled' :
              currentStatus === 'completed' ? 'completed' : 'upcoming'
    }
  ]

  // 직접 예약 단계
  const directSteps: Step[] = [
    {
      id: 'requested',
      title: '예약 요청',
      description: '트레이너에게 예약을 요청했습니다',
      icon: <Check className="h-5 w-5" />,
      status: 'completed'
    },
    {
      id: 'waiting_approval',
      title: '트레이너 승인 대기',
      description: currentStatus === 'confirmed' ? '트레이너가 승인했습니다' :
                   currentStatus === 'cancelled' ? '트레이너가 거절했습니다' :
                   '트레이너 승인을 기다리는 중입니다',
      icon: <Clock className="h-5 w-5" />,
      status: currentStatus === 'cancelled' ? 'cancelled' :
              currentStatus === 'confirmed' || currentStatus === 'in_progress' || currentStatus === 'completed' ? 'completed' : 'current'
    },
    {
      id: 'confirmed',
      title: '예약 확정',
      description: currentStatus === 'completed' ? '서비스가 완료되었습니다' :
                   currentStatus === 'confirmed' || currentStatus === 'in_progress' ? '예약이 확정되었습니다' :
                   '승인 후 확정됩니다',
      icon: <Calendar className="h-5 w-5" />,
      status: currentStatus === 'cancelled' ? 'cancelled' :
              currentStatus === 'completed' ? 'completed' :
              currentStatus === 'confirmed' || currentStatus === 'in_progress' ? 'current' : 'upcoming'
    },
    {
      id: 'completed',
      title: '서비스 완료',
      description: currentStatus === 'completed' ? '서비스가 완료되었습니다' : '예정된 날짜에 진행됩니다',
      icon: <CheckCircle2 className="h-5 w-5" />,
      status: currentStatus === 'cancelled' ? 'cancelled' :
              currentStatus === 'completed' ? 'completed' : 'upcoming'
    }
  ]

  const steps = bookingType === 'recommended' ? recommendedSteps : directSteps

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {currentStatus === 'cancelled' ? (
            <XCircle className="h-5 w-5 text-red-600" />
          ) : (
            <Calendar className="h-5 w-5 text-primary" />
          )}
          예약 진행 상황
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 모바일: 세로형 (기본값) */}
        <div className="relative md:hidden">
          {/* Progress Line - Vertical */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Steps - Vertical */}
          <div className="space-y-8">
            {steps.map((step, index) => (
              <div key={step.id} className="relative flex items-start gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300 flex-shrink-0",
                    step.status === 'completed' && "bg-green-500 border-green-500 text-white",
                    step.status === 'current' && "bg-blue-500 border-blue-500 text-white animate-pulse",
                    step.status === 'cancelled' && "bg-red-500 border-red-500 text-white",
                    step.status === 'upcoming' && "bg-gray-100 border-gray-300 text-gray-400"
                  )}
                >
                  {step.status === 'cancelled' ? <XCircle className="h-5 w-5" /> : step.icon}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <h4
                    className={cn(
                      "font-semibold transition-colors",
                      step.status === 'completed' && "text-green-700",
                      step.status === 'current' && "text-blue-700",
                      step.status === 'cancelled' && "text-red-700",
                      step.status === 'upcoming' && "text-gray-500"
                    )}
                  >
                    {step.title}
                  </h4>
                  <p
                    className={cn(
                      "text-sm mt-1 transition-colors",
                      step.status === 'upcoming' && "text-gray-400",
                      step.status !== 'upcoming' && "text-gray-600"
                    )}
                  >
                    {step.description}
                  </p>

                  {/* Timestamp */}
                  {step.id === 'requested' && createdAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(createdAt).toLocaleString('ko-KR')}
                    </p>
                  )}
                  {step.id === 'matching' && trainerMatchedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(trainerMatchedAt).toLocaleString('ko-KR')}
                    </p>
                  )}
                  {step.id === 'waiting_approval' && trainerConfirmedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(trainerConfirmedAt).toLocaleString('ko-KR')}
                    </p>
                  )}
                  {step.id === 'confirmed' && (currentStatus === 'in_progress' || currentStatus === 'completed') && serviceStartedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(serviceStartedAt).toLocaleString('ko-KR')}
                    </p>
                  )}
                  {step.id === 'completed' && serviceCompletedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(serviceCompletedAt).toLocaleString('ko-KR')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 데스크탑: 가로형 (md 이상) */}
        <div className="relative hidden md:block">
          {/* Steps - Horizontal */}
          <div className="flex items-start justify-between gap-4 relative">
            {/* Progress Line - Horizontal (첫 아이콘 중심 ~ 마지막 아이콘 중심) */}
            <div
              className="absolute top-6 h-0.5 bg-gray-200"
              style={{
                left: `calc((100% / ${steps.length}) / 2)`,
                right: `calc((100% / ${steps.length}) / 2)`
              }}
            />

            {steps.map((step, index) => (
              <div key={step.id} className="relative flex flex-col items-center flex-1 min-w-0">
                {/* Icon */}
                <div
                  className={cn(
                    "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300 flex-shrink-0",
                    step.status === 'completed' && "bg-green-500 border-green-500 text-white",
                    step.status === 'current' && "bg-blue-500 border-blue-500 text-white animate-pulse",
                    step.status === 'cancelled' && "bg-red-500 border-red-500 text-white",
                    step.status === 'upcoming' && "bg-gray-100 border-gray-300 text-gray-400"
                  )}
                >
                  {step.status === 'cancelled' ? <XCircle className="h-5 w-5" /> : step.icon}
                </div>

                {/* Content */}
                <div className="mt-4 text-center w-full">
                  <h4
                    className={cn(
                      "font-semibold transition-colors text-sm",
                      step.status === 'completed' && "text-green-700",
                      step.status === 'current' && "text-blue-700",
                      step.status === 'cancelled' && "text-red-700",
                      step.status === 'upcoming' && "text-gray-500"
                    )}
                  >
                    {step.title}
                  </h4>
                  <p
                    className={cn(
                      "text-xs mt-1 transition-colors",
                      step.status === 'upcoming' && "text-gray-400",
                      step.status !== 'upcoming' && "text-gray-600"
                    )}
                  >
                    {step.description}
                  </p>

                  {/* Timestamp */}
                  {step.id === 'requested' && createdAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(createdAt).toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                  {step.id === 'matching' && trainerMatchedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(trainerMatchedAt).toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                  {step.id === 'waiting_approval' && trainerConfirmedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(trainerConfirmedAt).toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                  {step.id === 'confirmed' && (currentStatus === 'in_progress' || currentStatus === 'completed') && serviceStartedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(serviceStartedAt).toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                  {step.id === 'completed' && serviceCompletedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(serviceCompletedAt).toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
