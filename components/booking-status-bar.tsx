'use client'

import { cn } from '@/lib/utils'

interface BookingStatusBarProps {
  bookingType: 'direct' | 'recommended'
  currentStatus: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  hasTrainer: boolean
}

export function BookingStatusBar({
  bookingType,
  currentStatus,
  hasTrainer
}: BookingStatusBarProps) {

  // 추천 예약 단계
  const recommendedSteps = [
    { id: 'requested', label: '접수' },
    { id: 'matching', label: '매칭' },
    { id: 'approval', label: '승인' },
    { id: 'confirmed', label: '확정' }
  ]

  // 직접 예약 단계
  const directSteps = [
    { id: 'requested', label: '요청' },
    { id: 'approval', label: '승인' },
    { id: 'confirmed', label: '확정' }
  ]

  const steps = bookingType === 'recommended' ? recommendedSteps : directSteps

  // 현재 진행 단계 계산
  const getCurrentStep = () => {
    if (currentStatus === 'cancelled' || currentStatus === 'no_show') return -1
    if (currentStatus === 'completed' || currentStatus === 'in_progress' || currentStatus === 'confirmed') {
      return steps.length - 1 // 마지막 단계 (확정)
    }
    if (bookingType === 'recommended') {
      if (hasTrainer) return 2 // 승인 대기
      return 1 // 매칭 중
    }
    return 1 // 직접 예약 승인 대기
  }

  const currentStep = getCurrentStep()
  const isCancelled = currentStatus === 'cancelled' || currentStatus === 'no_show'

  return (
    <div className="w-full">
      {/* 진행 바 */}
      <div className="relative flex items-center justify-between mb-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isUpcoming = index > currentStep

          return (
            <div key={step.id} className="flex-1 flex items-center">
              {/* 원형 표시 */}
              <div className="relative flex items-center justify-center">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 transition-all",
                    isCancelled && "bg-red-500 border-red-500",
                    !isCancelled && isCompleted && "bg-green-500 border-green-500",
                    !isCancelled && isCurrent && "bg-blue-500 border-blue-500 ring-4 ring-blue-200",
                    !isCancelled && isUpcoming && "bg-gray-200 border-gray-300"
                  )}
                />
              </div>

              {/* 연결선 (마지막 단계 제외) */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-1 mx-1.5 transition-all rounded",
                    isCancelled && "bg-red-300",
                    !isCancelled && index < currentStep && "bg-green-500",
                    !isCancelled && index >= currentStep && "bg-gray-300"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* 단계 라벨 */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep

          return (
            <div
              key={step.id}
              className={cn(
                "text-xs transition-colors",
                isCancelled && "text-red-600",
                !isCancelled && (isCompleted || isCurrent) && "text-gray-900 font-medium",
                !isCancelled && index > currentStep && "text-gray-400"
              )}
            >
              {step.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
