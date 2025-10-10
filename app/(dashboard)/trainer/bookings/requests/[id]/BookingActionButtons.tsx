'use client'

import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { acceptBookingRequest, declineBookingRequest } from './actions'

export function AcceptBookingButton({ bookingId, trainerId }: { bookingId: string; trainerId: string }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleAccept = async () => {
    if (!confirm('이 예약을 승인하시겠습니까?')) {
      return
    }

    setIsLoading(true)

    try {
      await acceptBookingRequest(bookingId)
    } catch (error) {
      console.error('Accept error:', error)
      alert(error instanceof Error ? error.message : '승인 중 오류가 발생했습니다')
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleAccept}
      disabled={isLoading}
      className="flex-1"
      size="lg"
    >
      <Check className="h-5 w-5 mr-2" />
      {isLoading ? '승인 중...' : '예약 승인'}
    </Button>
  )
}

export function RejectBookingButton({ bookingId, trainerId }: { bookingId: string; trainerId: string }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleReject = async () => {
    if (!confirm('이 예약을 거절하시겠습니까?')) {
      return
    }

    setIsLoading(true)

    try {
      await declineBookingRequest(bookingId)
    } catch (error) {
      console.error('Reject error:', error)
      alert(error instanceof Error ? error.message : '거절 중 오류가 발생했습니다')
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleReject}
      disabled={isLoading}
      variant="outline"
      className="flex-1"
      size="lg"
    >
      <X className="h-5 w-5 mr-2" />
      {isLoading ? '거절 중...' : '거절'}
    </Button>
  )
}
