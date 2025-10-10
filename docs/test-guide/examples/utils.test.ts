// ===================================================================
// lib/__tests__/utils.test.ts
// 복붙 가능한 완전한 유틸리티 테스트 예시
// ===================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculatePricingInfo,
  calculateCancellationFee,
  calculateAge,
  combineDateTime,
  calculateTimeRange,
  canCancelBooking,
  formatPrice,
  formatDate,
  mapFormServiceTypeToDb,
  mapDbServiceTypeToForm
} from '../utils'
import { BOOKING_TYPE, SERVICE_TYPES } from '../constants'

describe('가격 계산 함수', () => {
  describe('calculatePricingInfo', () => {
    it('Direct 예약: 시급 100,000원 × 1시간 × 1.3배 = 130,000원', () => {
      const result = calculatePricingInfo(100000, 60, BOOKING_TYPE.DIRECT)

      expect(result.hourly_rate).toBe(100000)
      expect(result.duration_minutes).toBe(60)
      expect(result.booking_type).toBe(BOOKING_TYPE.DIRECT)
      expect(result.price_multiplier).toBe(1.3)
      expect(result.base_price).toBe(100000)
      expect(result.price_per_person).toBe(130000)
      expect(result.total_price).toBe(130000)
    })

    it('Recommended 예약: 시급 100,000원 × 1시간 × 1배 = 100,000원', () => {
      const result = calculatePricingInfo(100000, 60, BOOKING_TYPE.RECOMMENDED)

      expect(result.price_multiplier).toBe(1.0)
      expect(result.price_per_person).toBe(100000)
      expect(result.total_price).toBe(100000)
    })

    it('30분 예약: 시급의 절반 가격', () => {
      const result = calculatePricingInfo(100000, 30, BOOKING_TYPE.DIRECT)

      expect(result.base_price).toBe(50000)
      expect(result.total_price).toBe(65000)
    })

    it('플랫폼 수수료 15% 계산', () => {
      const result = calculatePricingInfo(100000, 60, BOOKING_TYPE.DIRECT, 15)

      expect(result.platform_fee).toBe(19500)
    })
  })

  describe('calculateCancellationFee', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2025-01-15T09:00:00'))
    })

    it('7일 이상 전 취소: 수수료 0%', () => {
      const result = calculateCancellationFee(100000, '2025-01-22', '10:00:00')

      expect(result.feeRate).toBe(0)
      expect(result.feeAmount).toBe(0)
      expect(result.refundAmount).toBe(100000)
    })

    it('5일 전 취소: 수수료 30%', () => {
      const result = calculateCancellationFee(100000, '2025-01-20', '10:00:00')

      expect(result.feeRate).toBe(0.3)
      expect(result.feeAmount).toBe(30000)
      expect(result.refundAmount).toBe(70000)
    })

    it('2일 전 취소: 수수료 50%', () => {
      const result = calculateCancellationFee(100000, '2025-01-17', '10:00:00')

      expect(result.feeRate).toBe(0.5)
      expect(result.feeAmount).toBe(50000)
      expect(result.refundAmount).toBe(50000)
    })

    it('12시간 전 취소: 수수료 80%', () => {
      const result = calculateCancellationFee(100000, '2025-01-15', '21:00:00')

      expect(result.feeRate).toBe(0.8)
      expect(result.feeAmount).toBe(80000)
      expect(result.refundAmount).toBe(20000)
    })
  })
})

describe('날짜/시간 유틸리티', () => {
  it('combineDateTime: 날짜와 시간 정확하게 조합', () => {
    const result = combineDateTime('2025-01-15', '14:30:00')

    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(15)
    expect(result.getHours()).toBe(14)
    expect(result.getMinutes()).toBe(30)
  })

  it('calculateTimeRange: 시작/종료 시간 계산', () => {
    const date = new Date('2025-01-15T14:00:00')
    const result = calculateTimeRange(date, 60)

    expect(result.start_time).toBe('14:00:00')
    expect(result.end_time).toBe('15:00:00')
  })

  it('calculateAge: 만 나이 계산', () => {
    vi.setSystemTime(new Date('2025-01-15'))

    expect(calculateAge('1960-01-01')).toBe(65)
    expect(calculateAge('1960-12-31')).toBe(64)
    expect(calculateAge(null)).toBe(null)
  })

  it('canCancelBooking: 취소 가능 여부', () => {
    vi.setSystemTime(new Date('2025-01-15T09:00:00'))

    const result = canCancelBooking({
      booking_date: '2025-01-17',
      start_time: '10:00:00'
    })

    expect(result.canCancel).toBe(true)
    expect(result.hoursUntil).toBeCloseTo(49, 0)
  })
})

describe('서비스 타입 변환', () => {
  it('폼 값 → DB 값 변환', () => {
    expect(mapFormServiceTypeToDb('home')).toBe(SERVICE_TYPES.HOME_VISIT)
    expect(mapFormServiceTypeToDb('center')).toBe(SERVICE_TYPES.CENTER_VISIT)
  })

  it('DB 값 → 폼 값 변환', () => {
    expect(mapDbServiceTypeToForm(SERVICE_TYPES.HOME_VISIT)).toBe('home')
    expect(mapDbServiceTypeToForm(SERVICE_TYPES.CENTER_VISIT)).toBe('center')
  })
})

describe('포맷팅 함수', () => {
  it('formatPrice: 금액 포맷팅', () => {
    expect(formatPrice(100000)).toBe('100,000원')
    expect(formatPrice(null)).toBe('미정')
  })

  it('formatDate: 날짜 포맷팅', () => {
    const date = new Date('2025-01-15')
    const formatted = formatDate(date)

    expect(formatted).toContain('2025')
    expect(formatted).toContain('1월')
    expect(formatted).toContain('15일')
  })
})
