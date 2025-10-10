# 01. 단위 테스트 완벽 가이드

> **목표**: lib/utils.ts, lib/constants.ts 등 핵심 로직을 자동으로 검증하는 테스트 작성

---

## 📋 목차

1. [Vitest 설정](#1-vitest-설정)
2. [유틸리티 함수 테스트](#2-유틸리티-함수-테스트)
3. [컴포넌트 테스트](#3-컴포넌트-테스트)
4. [테스트 실행](#4-테스트-실행)
5. [커버리지 확인](#5-커버리지-확인)

---

## 1. Vitest 설정

### 1.1 패키지 설치 (5분)

```bash
# Vitest 및 테스팅 라이브러리 설치
npm install -D vitest @vitejs/plugin-react
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event jsdom
npm install -D @vitest/ui vitest-canvas-mock
```

**설치되는 것:**
- `vitest`: 테스트 러너 (Jest보다 빠름)
- `@testing-library/react`: React 컴포넌트 테스트
- `jsdom`: 브라우저 환경 시뮬레이션
- `@vitest/ui`: 테스트 결과 UI로 보기

---

### 1.2 Vitest 설정 파일 생성 (5분)

**파일: `vitest.config.ts` (프로젝트 루트)**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // 브라우저 환경 시뮬레이션
    environment: 'jsdom',

    // 전역 함수 사용 가능 (describe, it, expect)
    globals: true,

    // 테스트 전 실행할 파일
    setupFiles: './vitest.setup.ts',

    // 커버리지 설정
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'tests/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

---

### 1.3 Setup 파일 생성 (2분)

**파일: `vitest.setup.ts` (프로젝트 루트)**

```typescript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// 각 테스트 후 자동 cleanup
afterEach(() => {
  cleanup()
})

// 환경변수 모킹 (필요시)
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
```

---

### 1.4 package.json 스크립트 추가 (2분)

**파일: `package.json`**

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest --coverage"
  }
}
```

**사용법:**
```bash
npm test              # 테스트 실행 (watch 모드)
npm run test:ui       # UI로 테스트 결과 보기
npm run test:run      # 1회 실행 (CI용)
npm run test:coverage # 커버리지 확인
```

---

## 2. 유틸리티 함수 테스트

### 2.1 가격 계산 함수 테스트 (핵심!)

**파일: `lib/__tests__/utils.test.ts`**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculatePricingInfo,
  calculateCancellationFee,
  calculateAge,
  combineDateTime,
  calculateTimeRange,
  canCancelBooking,
  formatPrice,
  formatDate
} from '../utils'
import { BOOKING_TYPE } from '../constants'

describe('가격 계산 함수', () => {
  describe('calculatePricingInfo', () => {
    it('Direct 예약: 시급 100,000원 × 1시간 × 1.3배 = 130,000원', () => {
      const result = calculatePricingInfo(100000, 60, BOOKING_TYPE.DIRECT)

      expect(result.hourly_rate).toBe(100000)
      expect(result.duration_minutes).toBe(60)
      expect(result.booking_type).toBe(BOOKING_TYPE.DIRECT)
      expect(result.price_multiplier).toBe(1.3)
      expect(result.base_price).toBe(100000)
      expect(result.price_per_person).toBe(130000) // 100k × 1.3
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

      expect(result.base_price).toBe(50000) // 100k × 0.5시간
      expect(result.price_per_person).toBe(130000) // 시급 × 1.3
      expect(result.total_price).toBe(65000) // 50k × 1.3
    })

    it('90분 예약: 시급의 1.5배 가격', () => {
      const result = calculatePricingInfo(100000, 90, BOOKING_TYPE.RECOMMENDED)

      expect(result.base_price).toBe(150000) // 100k × 1.5시간
      expect(result.price_per_person).toBe(100000)
      expect(result.total_price).toBe(150000)
    })

    it('플랫폼 수수료 15% 계산', () => {
      const result = calculatePricingInfo(100000, 60, BOOKING_TYPE.DIRECT, 15)

      expect(result.platform_fee).toBe(19500) // 130k × 15%
    })
  })

  describe('calculateCancellationFee', () => {
    beforeEach(() => {
      // 현재 시간을 2025-01-15 09:00:00으로 고정
      vi.setSystemTime(new Date('2025-01-15T09:00:00'))
    })

    it('7일 이상 전 취소: 수수료 0%', () => {
      const result = calculateCancellationFee(
        100000,
        '2025-01-22', // 7일 후
        '10:00:00'
      )

      expect(result.feeRate).toBe(0)
      expect(result.feeAmount).toBe(0)
      expect(result.refundAmount).toBe(100000)
      expect(result.timeCategory).toBe('7일 이상 전')
    })

    it('5일 전 취소: 수수료 30%', () => {
      const result = calculateCancellationFee(
        100000,
        '2025-01-20', // 5일 후
        '10:00:00'
      )

      expect(result.feeRate).toBe(0.3)
      expect(result.feeAmount).toBe(30000)
      expect(result.refundAmount).toBe(70000)
      expect(result.timeCategory).toBe('3-7일 전')
    })

    it('2일 전 취소: 수수료 50%', () => {
      const result = calculateCancellationFee(
        100000,
        '2025-01-17', // 2일 후
        '10:00:00'
      )

      expect(result.feeRate).toBe(0.5)
      expect(result.feeAmount).toBe(50000)
      expect(result.refundAmount).toBe(50000)
      expect(result.timeCategory).toBe('1-3일 전')
    })

    it('12시간 전 취소: 수수료 80%', () => {
      const result = calculateCancellationFee(
        100000,
        '2025-01-15', // 오늘
        '21:00:00' // 12시간 후
      )

      expect(result.feeRate).toBe(0.8)
      expect(result.feeAmount).toBe(80000)
      expect(result.refundAmount).toBe(20000)
      expect(result.timeCategory).toBe('24시간 이내')
    })

    it('반올림 처리 확인', () => {
      const result = calculateCancellationFee(
        10333, // 애매한 금액
        '2025-01-20',
        '10:00:00'
      )

      // 30% 수수료 = 3099.9 → 3100원으로 반올림
      expect(result.feeAmount).toBe(3100)
      expect(result.refundAmount).toBe(7233)
    })
  })
})

describe('날짜/시간 유틸리티', () => {
  describe('combineDateTime', () => {
    it('날짜와 시간을 정확하게 조합', () => {
      const result = combineDateTime('2025-01-15', '14:30:00')

      expect(result.getFullYear()).toBe(2025)
      expect(result.getMonth()).toBe(0) // 0 = January
      expect(result.getDate()).toBe(15)
      expect(result.getHours()).toBe(14)
      expect(result.getMinutes()).toBe(30)
      expect(result.getSeconds()).toBe(0)
    })
  })

  describe('calculateTimeRange', () => {
    it('시작/종료 시간을 정확하게 계산', () => {
      const date = new Date('2025-01-15T14:00:00')
      const result = calculateTimeRange(date, 60) // 60분

      expect(result.start_time).toBe('14:00:00')
      expect(result.end_time).toBe('15:00:00')
    })

    it('자정을 넘어가는 경우', () => {
      const date = new Date('2025-01-15T23:30:00')
      const result = calculateTimeRange(date, 60)

      expect(result.start_time).toBe('23:30:00')
      expect(result.end_time).toBe('00:30:00') // 다음날
    })

    it('90분 세션', () => {
      const date = new Date('2025-01-15T14:00:00')
      const result = calculateTimeRange(date, 90)

      expect(result.start_time).toBe('14:00:00')
      expect(result.end_time).toBe('15:30:00')
    })
  })

  describe('calculateAge', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2025-01-15'))
    })

    it('생일이 지난 경우 정확한 만 나이', () => {
      expect(calculateAge('1960-01-01')).toBe(65)
    })

    it('생일이 안 지난 경우 나이 -1', () => {
      expect(calculateAge('1960-12-31')).toBe(64)
    })

    it('오늘이 생일인 경우', () => {
      expect(calculateAge('1960-01-15')).toBe(65)
    })

    it('null 값 처리', () => {
      expect(calculateAge(null)).toBe(null)
      expect(calculateAge(undefined)).toBe(null)
    })

    it('Date 객체도 처리 가능', () => {
      const birthDate = new Date('1960-01-01')
      expect(calculateAge(birthDate)).toBe(65)
    })
  })

  describe('canCancelBooking', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2025-01-15T09:00:00'))
    })

    it('48시간 이상 남은 예약은 취소 가능', () => {
      const result = canCancelBooking({
        booking_date: '2025-01-17',
        start_time: '10:00:00'
      })

      expect(result.canCancel).toBe(true)
      expect(result.hoursUntil).toBeCloseTo(49, 0)
    })

    it('24시간 이내 예약은 취소 불가', () => {
      const result = canCancelBooking({
        booking_date: '2025-01-15',
        start_time: '21:00:00' // 12시간 후
      })

      expect(result.canCancel).toBe(false)
      expect(result.hoursUntil).toBeCloseTo(12, 0)
    })

    it('정확히 24시간 남은 경우는 취소 가능', () => {
      const result = canCancelBooking({
        booking_date: '2025-01-16',
        start_time: '09:00:00'
      })

      expect(result.canCancel).toBe(true)
      expect(result.hoursUntil).toBe(24)
    })
  })
})

describe('포맷팅 함수', () => {
  describe('formatPrice', () => {
    it('일반 금액 포맷팅', () => {
      expect(formatPrice(100000)).toBe('100,000원')
      expect(formatPrice(50000)).toBe('50,000원')
      expect(formatPrice(1234567)).toBe('1,234,567원')
    })

    it('0원 처리', () => {
      expect(formatPrice(0)).toBe('0원')
    })

    it('null/undefined 처리', () => {
      expect(formatPrice(null)).toBe('미정')
      expect(formatPrice(undefined)).toBe('미정')
    })
  })

  describe('formatDate', () => {
    it('기본 포맷', () => {
      const date = new Date('2025-01-15')
      const formatted = formatDate(date)

      expect(formatted).toContain('2025')
      expect(formatted).toContain('1월')
      expect(formatted).toContain('15일')
    })

    it('커스텀 옵션', () => {
      const date = new Date('2025-01-15')
      const formatted = formatDate(date, {
        year: 'numeric',
        month: '2-digit'
      })

      expect(formatted).toContain('2025')
      expect(formatted).toContain('01')
    })
  })
})
```

---

### 2.2 테스트 실행

```bash
# Watch 모드로 실행 (파일 저장시 자동 재실행)
npm test

# UI로 보기 (브라우저에서 열림)
npm run test:ui
```

**예상 결과:**
```
✓ lib/__tests__/utils.test.ts (25 tests)
  ✓ 가격 계산 함수 (5)
    ✓ Direct 예약: 시급 100,000원 × 1시간 × 1.3배 = 130,000원
    ✓ Recommended 예약: 시급 100,000원 × 1시간 × 1배 = 100,000원
    ✓ 30분 예약: 시급의 절반 가격
    ✓ 90분 예약: 시급의 1.5배 가격
    ✓ 플랫폼 수수료 15% 계산
  ✓ 취소 수수료 계산 (5)
  ✓ 날짜/시간 유틸리티 (10)
  ✓ 포맷팅 함수 (5)

Test Files  1 passed (1)
     Tests  25 passed (25)
  Start at  09:00:00
  Duration  145ms
```

---

## 3. 컴포넌트 테스트

### 3.1 간단한 컴포넌트 테스트

**파일: `components/__tests__/success-message.test.tsx`**

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SuccessMessage } from '../success-message'

describe('SuccessMessage', () => {
  it('성공 메시지를 올바르게 렌더링', () => {
    render(<SuccessMessage message="예약이 완료되었습니다" />)

    expect(screen.getByText('예약이 완료되었습니다')).toBeInTheDocument()
  })

  it('메시지가 없으면 렌더링 안 함', () => {
    const { container } = render(<SuccessMessage message="" />)

    expect(container.firstChild).toBeNull()
  })
})
```

---

### 3.2 복잡한 컴포넌트 테스트 (예시)

**파일: `components/__tests__/booking-card.test.tsx`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CustomerBookingCard } from '../customer-booking-card'
import { BOOKING_STATUS } from '@/lib/constants'

describe('CustomerBookingCard', () => {
  const mockBooking = {
    id: '123',
    booking_date: '2025-01-20',
    start_time: '14:00:00',
    end_time: '15:00:00',
    status: BOOKING_STATUS.CONFIRMED,
    service_type: 'home_visit' as const,
    total_price: 130000,
    trainer: {
      id: 'trainer-1',
      profile_id: 'profile-1',
      profiles: {
        full_name: '김트레이너',
        avatar_url: null,
        email: 'trainer@test.com',
        phone: '010-1234-5678'
      }
    },
    customer: {
      id: 'customer-1',
      profiles: {
        full_name: '고객님',
        avatar_url: null,
        email: 'customer@test.com',
        phone: '010-9876-5432'
      }
    }
  }

  it('예약 정보가 올바르게 표시됨', () => {
    render(<CustomerBookingCard booking={mockBooking} />)

    // 트레이너 이름
    expect(screen.getByText('김트레이너')).toBeInTheDocument()

    // 날짜 (정확한 텍스트는 formatDate 결과에 따라)
    expect(screen.getByText(/2025/)).toBeInTheDocument()
    expect(screen.getByText(/1월/)).toBeInTheDocument()

    // 가격
    expect(screen.getByText(/130,000원/)).toBeInTheDocument()

    // 상태
    expect(screen.getByText('확정됨')).toBeInTheDocument()
  })

  it('취소된 예약은 취소 버튼이 안 보임', () => {
    const cancelledBooking = {
      ...mockBooking,
      status: BOOKING_STATUS.CANCELLED
    }

    render(<CustomerBookingCard booking={cancelledBooking} />)

    expect(screen.queryByText('예약 취소')).not.toBeInTheDocument()
  })

  it('24시간 이내 예약은 취소 경고 표시', () => {
    // 현재 시간 모킹
    vi.setSystemTime(new Date('2025-01-20T13:00:00'))

    render(<CustomerBookingCard booking={mockBooking} />)

    expect(screen.getByText(/24시간 이내 취소 불가/)).toBeInTheDocument()
  })
})
```

---

## 4. 테스트 실행

### 4.1 기본 실행

```bash
# Watch 모드 (개발 중 사용)
npm test

# 1회 실행 (CI에서 사용)
npm run test:run

# 특정 파일만
npm test utils.test.ts

# 특정 describe만
npm test -t "가격 계산"
```

---

### 4.2 UI 모드 (추천!)

```bash
npm run test:ui
```

**브라우저에서 열리는 것:**
- 모든 테스트 목록
- 각 테스트 결과 (✓ or ✗)
- 실패한 테스트의 상세 정보
- 코드 커버리지 시각화

---

## 5. 커버리지 확인

### 5.1 커버리지 리포트 생성

```bash
npm run test:coverage
```

**결과:**
```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   73.45 |    68.42 |   75.00 |   73.45 |
 lib                |   85.71 |    75.00 |   90.00 |   85.71 |
  constants.ts      |     100 |      100 |     100 |     100 |
  utils.ts          |   82.14 |    71.42 |   87.50 |   82.14 |
 components         |   65.00 |    60.00 |   70.00 |   65.00 |
  booking-card.tsx  |   70.00 |    66.66 |   75.00 |   70.00 |
--------------------|---------|----------|---------|---------|
```

**HTML 리포트:**
```bash
open coverage/index.html
```

---

### 5.2 커버리지 목표

| Phase | 목표 커버리지 | 우선순위 파일 |
|-------|--------------|--------------|
| **Phase 1** | 50%+ | lib/utils.ts, lib/constants.ts |
| **Phase 2** | 70%+ | 위 + 핵심 컴포넌트 |
| **Phase 3** | 80%+ | 위 + Server Actions |

**우선순위:**
1. 🔥 **돈 관련**: 가격 계산, 취소 수수료
2. 🔥 **핵심 로직**: 예약 로직, 인증
3. ⚡ **유틸리티**: 날짜/시간, 포맷팅
4. ✨ **컴포넌트**: 자주 사용되는 컴포넌트

---

## 📊 체크리스트

### 설정 완료
- [ ] Vitest 패키지 설치
- [ ] vitest.config.ts 생성
- [ ] vitest.setup.ts 생성
- [ ] package.json 스크립트 추가

### 테스트 작성
- [ ] lib/__tests__/utils.test.ts 작성
- [ ] 가격 계산 테스트 5개 이상
- [ ] 취소 수수료 테스트 5개 이상
- [ ] 날짜/시간 테스트 5개 이상
- [ ] 포맷팅 테스트 3개 이상

### 실행 확인
- [ ] npm test 정상 작동
- [ ] npm run test:ui 확인
- [ ] npm run test:coverage 확인
- [ ] 커버리지 50% 이상 달성

---

## 🐛 문제 해결

### "Cannot find module '@/lib/utils'"
```bash
# tsconfig.json 확인
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### "window is not defined"
```typescript
// vitest.config.ts에서 environment 확인
test: {
  environment: 'jsdom', // 이게 있어야 함
}
```

### 시간 관련 테스트가 실패함
```typescript
// 테스트에서 시간 모킹 사용
vi.setSystemTime(new Date('2025-01-15T09:00:00'))
```

---

## 🎯 다음 단계

1. ✅ 단위 테스트 완료
2. → [02-E2E_TESTING.md](./02-E2E_TESTING.md) - E2E 테스트
3. → [03-ERROR_MONITORING.md](./03-ERROR_MONITORING.md) - Sentry 설정

---

**작성일**: 2025-01-10
**대상**: AI 에이전트 & 개발자
**난이도**: ⭐⭐⭐ (중급)
