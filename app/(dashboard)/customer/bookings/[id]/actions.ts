'use server'

import { revalidatePath } from 'next/cache'
import type { CancellationReason } from '@/lib/constants'

/**
 * 고객 예약 취소 (서버 액션)
 * 실제 취소 로직은 /api/bookings/[bookingId]/cancel API로 이동
 */
export async function cancelBooking(
  bookingId: string,
  reason: CancellationReason,
  notes?: string
) {
  try {
    // API 호출
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancellationReason: notes || reason,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ [CANCEL] API error:', data)
      return {
        error: data.error || data.userMessage || '예약 취소에 실패했습니다.'
      }
    }

    // 페이지 재검증
    revalidatePath(`/customer/bookings/${bookingId}`)
    revalidatePath('/customer/bookings')

    return {
      success: true,
      refundAmount: data.data.refundAmount,
      feeAmount: data.data.feeAmount
    }
  } catch (error) {
    console.error('💥 [CANCEL] Unexpected error:', error)
    return {
      error: error instanceof Error ? error.message : '예약 취소 중 오류가 발생했습니다.'
    }
  }
}
