/**
 * 예약 취소 수수료 계산 로직
 *
 * 취소 시점에 따른 수수료율:
 * - 7일 이상 전: 0% (전액 환불)
 * - 3-7일 전: 30% 수수료
 * - 1-3일 전: 50% 수수료
 * - 24시간 이내: 80% 수수료
 */

export interface CancellationFeeResult {
  feeRate: number              // 수수료율 (0.0 ~ 1.0)
  feeAmount: number            // 수수료 금액
  refundAmount: number         // 환불 금액
  daysUntilBooking: number     // 예약까지 남은 일수
  hoursUntilBooking: number    // 예약까지 남은 시간
  canCancel: boolean           // 취소 가능 여부
  cancellationReason?: string  // 취소 불가 사유
}

/**
 * 취소 수수료 계산
 * @param bookingDateTime - 예약 일시 (ISO string 또는 Date)
 * @param totalAmount - 총 결제 금액
 * @param currentDateTime - 현재 시간 (테스트용, 기본값: 현재 시간)
 * @returns 취소 수수료 계산 결과
 */
export function calculateCancellationFee(
  bookingDateTime: string | Date,
  totalAmount: number,
  currentDateTime?: Date
): CancellationFeeResult {
  const now = currentDateTime || new Date()
  const bookingDate = typeof bookingDateTime === 'string'
    ? new Date(bookingDateTime)
    : bookingDateTime

  // 시간 차이 계산 (밀리초)
  const timeDiff = bookingDate.getTime() - now.getTime()

  // 예약 시간이 이미 지났으면 취소 불가
  if (timeDiff <= 0) {
    return {
      feeRate: 1.0,
      feeAmount: totalAmount,
      refundAmount: 0,
      daysUntilBooking: 0,
      hoursUntilBooking: 0,
      canCancel: false,
      cancellationReason: '예약 시간이 이미 지났습니다.'
    }
  }

  // 시간 변환
  const hoursUntilBooking = timeDiff / (1000 * 60 * 60)
  const daysUntilBooking = hoursUntilBooking / 24

  // 수수료율 결정
  let feeRate: number

  if (daysUntilBooking >= 7) {
    // 7일 이상 전: 전액 환불
    feeRate = 0.0
  } else if (daysUntilBooking >= 3) {
    // 3-7일 전: 30% 수수료
    feeRate = 0.3
  } else if (daysUntilBooking >= 1) {
    // 1-3일 전: 50% 수수료
    feeRate = 0.5
  } else {
    // 24시간 이내: 80% 수수료
    feeRate = 0.8
  }

  // 금액 계산
  const feeAmount = Math.round(totalAmount * feeRate)
  const refundAmount = totalAmount - feeAmount

  return {
    feeRate,
    feeAmount,
    refundAmount,
    daysUntilBooking,
    hoursUntilBooking,
    canCancel: true
  }
}

/**
 * 취소 수수료 정보를 사용자 친화적 메시지로 변환
 */
export function getCancellationFeeMessage(result: CancellationFeeResult): {
  title: string
  description: string
  warningLevel: 'info' | 'warning' | 'error'
} {
  if (!result.canCancel) {
    return {
      title: '취소 불가',
      description: result.cancellationReason || '취소할 수 없는 예약입니다.',
      warningLevel: 'error'
    }
  }

  const { feeRate, feeAmount, refundAmount, daysUntilBooking } = result

  if (feeRate === 0) {
    return {
      title: '전액 환불',
      description: `예약 7일 전이므로 전액 환불됩니다. (${refundAmount.toLocaleString()}원)`,
      warningLevel: 'info'
    }
  }

  const daysText = daysUntilBooking >= 1
    ? `약 ${Math.floor(daysUntilBooking)}일`
    : `약 ${Math.floor(result.hoursUntilBooking)}시간`

  return {
    title: `취소 수수료 ${(feeRate * 100).toFixed(0)}%`,
    description: `예약까지 ${daysText} 남았습니다.\n수수료 ${feeAmount.toLocaleString()}원 공제 후 ${refundAmount.toLocaleString()}원이 환불됩니다.`,
    warningLevel: feeRate >= 0.5 ? 'error' : 'warning'
  }
}

/**
 * Stripe Payment Intent partial capture 금액 계산
 * @param authorizedAmount - 승인된 총 금액 (원 단위)
 * @param feeAmount - 취소 수수료 (원 단위)
 * @returns Stripe에 전달할 capture 금액 (센트 단위)
 */
export function calculatePartialCaptureAmount(
  authorizedAmount: number,
  feeAmount: number
): number {
  // 수수료만 청구 (원 단위 -> 센트 단위 변환은 호출자에서 처리)
  return feeAmount
}

/**
 * 취소 정책 전체 안내 텍스트
 */
export const CANCELLATION_POLICY_TEXT = `
📋 취소 정책

• 예약 7일 전: 전액 환불 (수수료 없음)
• 예약 3-7일 전: 30% 취소 수수료
• 예약 1-3일 전: 50% 취소 수수료
• 예약 24시간 이내: 80% 취소 수수료

💡 취소 수수료는 예약 시 승인된 카드로 자동 청구됩니다.
💡 환불 금액은 3-5 영업일 내 카드사를 통해 환불됩니다.
`.trim()
