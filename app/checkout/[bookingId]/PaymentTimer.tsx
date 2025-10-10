'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface PaymentTimerProps {
  bookingType: 'direct' | 'recommended'
  createdAt: string // ISO string
  bookingId: string
}

export default function PaymentTimer({ bookingType, createdAt, bookingId }: PaymentTimerProps) {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    // 만료 시간 계산
    const createdTime = new Date(createdAt).getTime()
    const expiryDuration = bookingType === 'direct'
      ? 10 * 60 * 1000  // 10분
      : 24 * 60 * 60 * 1000  // 24시간

    const calculateTimeLeft = () => {
      const now = Date.now()
      const expiryTime = createdTime + expiryDuration
      const remaining = expiryTime - now

      if (remaining <= 0) {
        setIsExpired(true)
        setTimeLeft(0)
        return 0
      }

      setTimeLeft(remaining)
      return remaining
    }

    // 초기 계산
    const initial = calculateTimeLeft()

    // 이미 만료된 경우
    if (initial <= 0) {
      return
    }

    // 1초마다 업데이트
    const interval = setInterval(() => {
      const remaining = calculateTimeLeft()

      if (remaining <= 0) {
        clearInterval(interval)
        // 3초 후 예약 목록으로 리다이렉트
        setTimeout(() => {
          router.push('/customer/bookings')
        }, 3000)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [createdAt, bookingType, router, bookingId])

  if (timeLeft === null) {
    return null // 로딩 중
  }

  if (isExpired) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl">⏰</span>
          <div>
            <h3 className="text-xl font-bold text-red-600 mb-1">결제 시간이 만료되었습니다</h3>
            <p className="text-red-700">
              예약이 자동으로 취소되었습니다. 다시 예약해주세요.
            </p>
            <p className="text-sm text-red-600 mt-2">
              3초 후 예약 목록으로 이동합니다...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 시간 포맷팅
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)

    if (bookingType === 'direct') {
      // 10분 이하 - 분:초 표시
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    } else {
      // 24시간 - 시간:분:초 표시
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      return `${hours}시간 ${minutes}분 ${seconds}초`
    }
  }

  // 긴급도에 따른 스타일
  const urgency = bookingType === 'direct'
    ? timeLeft < 3 * 60 * 1000 // 3분 미만
      ? 'urgent'
      : timeLeft < 5 * 60 * 1000 // 5분 미만
        ? 'warning'
        : 'normal'
    : 'normal'

  const styles = {
    urgent: {
      bg: 'bg-red-50 border-red-300',
      text: 'text-red-700',
      timer: 'text-red-600',
      icon: '🚨',
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-300',
      text: 'text-yellow-700',
      timer: 'text-yellow-600',
      icon: '⚠️',
    },
    normal: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-700',
      timer: 'text-blue-600',
      icon: '⏰',
    },
  }

  const style = styles[urgency]

  return (
    <div className={`${style.bg} border-2 rounded-lg p-4 mb-6`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{style.icon}</span>
          <div>
            <p className={`text-sm font-medium ${style.text}`}>
              {bookingType === 'direct' ? '결제 시간 제한' : '결제 가능 시간'}
            </p>
            <p className={`text-2xl font-bold ${style.timer}`}>
              {formatTime(timeLeft)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600">
            {bookingType === 'direct'
              ? '10분 이내 결제 필요'
              : '24시간 이내 결제 가능'}
          </p>
        </div>
      </div>
      {urgency === 'urgent' && (
        <p className="text-sm text-red-600 mt-2 font-medium">
          ⚡ 시간이 얼마 남지 않았습니다! 서두르세요!
        </p>
      )}
    </div>
  )
}
