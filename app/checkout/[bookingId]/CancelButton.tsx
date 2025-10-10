'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface CancelButtonProps {
  bookingId: string
}

export default function CancelButton({ bookingId }: CancelButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleCancel = async () => {
    if (!confirm('결제를 취소하고 예약을 삭제하시겠습니까?')) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel-pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '예약 취소에 실패했습니다')
      }

      // 성공 시 예약 목록으로 이동
      router.push('/customer/bookings')
    } catch (error) {
      console.error('Booking cancellation error:', error)
      alert(error instanceof Error ? error.message : '예약 취소 중 오류가 발생했습니다')
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={isLoading}
      className="text-gray-600 hover:text-gray-900 underline disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? '취소 중...' : '취소하고 예약 목록으로 돌아가기'}
    </button>
  )
}
