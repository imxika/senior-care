/**
 * 결제 실패 복구 로직
 *
 * Payment Intent 실패 시 자동 복구 및 사용자 안내 메커니즘
 */

import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

// Stripe 에러 타입 정의
export type StripeErrorType =
  | 'card_error'           // 카드 문제 (잔액 부족, 거절 등)
  | 'validation_error'     // 입력 오류
  | 'api_error'           // Stripe API 오류
  | 'authentication_error' // 인증 오류
  | 'rate_limit_error'    // 요청 한도 초과
  | 'invalid_request_error' // 잘못된 요청
  | 'unknown_error'       // 기타 오류

// 복구 가능 여부
export interface RecoveryResult {
  canRetry: boolean
  shouldContactSupport: boolean
  userMessage: string
  technicalMessage?: string
  suggestedAction?: 'retry' | 'change_card' | 'contact_support' | 'wait'
  retryAfterSeconds?: number
}

/**
 * Stripe 에러 코드를 사용자 친화적 메시지로 변환
 */
export function handleStripeError(error: Stripe.StripeError): RecoveryResult {
  const errorType = error.type
  const errorCode = error.code
  const declineCode = (error as Stripe.errors.StripeCardError).decline_code

  // 카드 문제
  if (errorType === 'card_error') {
    switch (errorCode) {
      case 'insufficient_funds':
        return {
          canRetry: true,
          shouldContactSupport: false,
          userMessage: '카드 잔액이 부족합니다. 다른 카드를 사용해주세요.',
          technicalMessage: 'Card declined: insufficient_funds',
          suggestedAction: 'change_card'
        }

      case 'card_declined':
        // decline_code로 더 구체적인 메시지 제공
        if (declineCode === 'generic_decline') {
          return {
            canRetry: true,
            shouldContactSupport: false,
            userMessage: '카드사에서 결제를 거절했습니다. 카드사에 문의하거나 다른 카드를 사용해주세요.',
            technicalMessage: `Card declined: ${declineCode}`,
            suggestedAction: 'change_card'
          }
        }
        return {
          canRetry: true,
          shouldContactSupport: false,
          userMessage: '카드 결제가 거절되었습니다. 다른 카드를 사용하거나 카드사에 문의해주세요.',
          technicalMessage: `Card declined: ${declineCode || 'unknown'}`,
          suggestedAction: 'change_card'
        }

      case 'expired_card':
        return {
          canRetry: true,
          shouldContactSupport: false,
          userMessage: '카드 유효기간이 만료되었습니다. 다른 카드를 사용해주세요.',
          technicalMessage: 'Card expired',
          suggestedAction: 'change_card'
        }

      case 'incorrect_cvc':
        return {
          canRetry: true,
          shouldContactSupport: false,
          userMessage: '카드 보안코드(CVC)가 올바르지 않습니다. 다시 확인해주세요.',
          technicalMessage: 'Incorrect CVC',
          suggestedAction: 'retry'
        }

      case 'processing_error':
        return {
          canRetry: true,
          shouldContactSupport: false,
          userMessage: '카드 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          technicalMessage: 'Card processing error',
          suggestedAction: 'retry',
          retryAfterSeconds: 30
        }

      default:
        return {
          canRetry: true,
          shouldContactSupport: false,
          userMessage: '카드 결제 중 오류가 발생했습니다. 다른 카드를 사용하거나 잠시 후 다시 시도해주세요.',
          technicalMessage: `Card error: ${errorCode}`,
          suggestedAction: 'change_card'
        }
    }
  }

  // 입력 검증 오류
  if (errorType === 'validation_error') {
    return {
      canRetry: true,
      shouldContactSupport: false,
      userMessage: '입력하신 정보를 다시 확인해주세요.',
      technicalMessage: `Validation error: ${errorCode}`,
      suggestedAction: 'retry'
    }
  }

  // API 오류 (Stripe 서버 문제)
  if (errorType === 'api_error') {
    return {
      canRetry: true,
      shouldContactSupport: true,
      userMessage: '결제 시스템에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
      technicalMessage: `Stripe API error: ${errorCode}`,
      suggestedAction: 'wait',
      retryAfterSeconds: 60
    }
  }

  // 요청 한도 초과
  if (errorType === 'rate_limit_error') {
    return {
      canRetry: true,
      shouldContactSupport: false,
      userMessage: '너무 많은 요청이 발생했습니다. 1분 후 다시 시도해주세요.',
      technicalMessage: 'Rate limit exceeded',
      suggestedAction: 'wait',
      retryAfterSeconds: 60
    }
  }

  // 인증 오류 (서버 설정 문제)
  if (errorType === 'authentication_error') {
    return {
      canRetry: false,
      shouldContactSupport: true,
      userMessage: '결제 시스템 설정에 문제가 있습니다. 고객센터에 문의해주세요.',
      technicalMessage: 'Stripe authentication error',
      suggestedAction: 'contact_support'
    }
  }

  // 잘못된 요청
  if (errorType === 'invalid_request_error') {
    return {
      canRetry: false,
      shouldContactSupport: true,
      userMessage: '결제 요청에 오류가 있습니다. 고객센터에 문의해주세요.',
      technicalMessage: `Invalid request: ${errorCode}`,
      suggestedAction: 'contact_support'
    }
  }

  // 기타 오류
  return {
    canRetry: true,
    shouldContactSupport: true,
    userMessage: '결제 중 오류가 발생했습니다. 잠시 후 다시 시도하거나 고객센터에 문의해주세요.',
    technicalMessage: `Unknown error: ${errorType} - ${errorCode}`,
    suggestedAction: 'retry',
    retryAfterSeconds: 30
  }
}

/**
 * Payment Intent 실패 시 DB 상태 업데이트
 */
export async function handlePaymentFailure(
  bookingId: string,
  paymentId: string,
  errorInfo: RecoveryResult
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // 1. Payment 상태 업데이트
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        payment_status: 'failed',
        payment_metadata: {
          error: errorInfo.technicalMessage,
          userMessage: errorInfo.userMessage,
          canRetry: errorInfo.canRetry,
          failedAt: new Date().toISOString()
        }
      })
      .eq('id', paymentId)

    if (paymentError) {
      console.error('Failed to update payment status:', paymentError)
      return { success: false, error: paymentError.message }
    }

    // 2. Booking 상태를 pending_payment으로 유지 (재시도 가능하도록)
    // 단, 복구 불가능한 경우에만 cancelled로 변경
    if (!errorInfo.canRetry) {
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: `결제 실패: ${errorInfo.userMessage}`
        })
        .eq('id', bookingId)

      if (bookingError) {
        console.error('Failed to cancel booking:', bookingError)
        return { success: false, error: bookingError.message }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error handling payment failure:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Payment Intent 재시도 가능 여부 확인
 */
export async function canRetryPayment(bookingId: string): Promise<{
  canRetry: boolean
  reason?: string
  retryCount?: number
  lastFailedAt?: string
}> {
  try {
    const supabase = await createClient()

    // 1. Booking 조회
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('status, created_at')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return { canRetry: false, reason: '예약을 찾을 수 없습니다.' }
    }

    // 2. 예약 상태 확인
    if (booking.status !== 'pending_payment') {
      return { canRetry: false, reason: '재시도할 수 없는 예약 상태입니다.' }
    }

    // 3. 실패 이력 조회
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('payment_status, payment_metadata, created_at')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })

    if (paymentsError) {
      return { canRetry: false, reason: '결제 이력을 확인할 수 없습니다.' }
    }

    const failedPayments = payments?.filter(p => p.payment_status === 'failed') || []
    const retryCount = failedPayments.length

    // 4. 재시도 횟수 제한 (최대 3회)
    if (retryCount >= 3) {
      return {
        canRetry: false,
        reason: '최대 재시도 횟수를 초과했습니다. 고객센터에 문의해주세요.',
        retryCount
      }
    }

    // 5. 마지막 실패 시간 확인 (30초 이내 재시도 방지)
    if (failedPayments.length > 0) {
      const lastFailed = new Date(failedPayments[0].created_at)
      const now = new Date()
      const diffSeconds = (now.getTime() - lastFailed.getTime()) / 1000

      if (diffSeconds < 30) {
        return {
          canRetry: false,
          reason: '잠시 후 다시 시도해주세요.',
          retryCount,
          lastFailedAt: lastFailed.toISOString()
        }
      }
    }

    return { canRetry: true, retryCount }
  } catch (error) {
    console.error('Error checking retry eligibility:', error)
    return { canRetry: false, reason: '재시도 가능 여부를 확인할 수 없습니다.' }
  }
}

/**
 * 예약 생성 후 30분 경과 시 자동 만료 (크론잡에서 호출)
 */
export async function expireUnpaidBookings(): Promise<{
  expired: number
  errors: string[]
}> {
  try {
    const supabase = await createClient()

    // 30분 전 시간 계산
    const thirtyMinutesAgo = new Date()
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30)

    // pending_payment 상태이면서 30분 이상 경과한 예약 조회
    const { data: unpaidBookings, error: queryError } = await supabase
      .from('bookings')
      .select('id, created_at')
      .eq('status', 'pending_payment')
      .lt('created_at', thirtyMinutesAgo.toISOString())

    if (queryError) {
      return { expired: 0, errors: [queryError.message] }
    }

    if (!unpaidBookings || unpaidBookings.length === 0) {
      return { expired: 0, errors: [] }
    }

    const errors: string[] = []
    let expiredCount = 0

    // 각 예약을 expired 상태로 변경
    for (const booking of unpaidBookings) {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'expired',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: '결제 시간 초과 (30분)'
        })
        .eq('id', booking.id)

      if (updateError) {
        errors.push(`Booking ${booking.id}: ${updateError.message}`)
      } else {
        expiredCount++
      }
    }

    return { expired: expiredCount, errors }
  } catch (error) {
    console.error('Error expiring unpaid bookings:', error)
    return {
      expired: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}
