# 04. 성능 모니터링 가이드

> **목표**: Core Web Vitals 추적 및 느린 작업 자동 감지

---

## 1. Vercel Analytics (무료)

### 1.1 패키지 설치

```bash
npm install @vercel/analytics @vercel/speed-insights
```

---

### 1.2 Layout에 추가

**파일: `app/layout.tsx`**

```typescript
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

---

## 2. 성능 측정 포인트

### 2.1 측정 유틸리티

**파일: `lib/monitoring.ts`**

```typescript
import * as Sentry from '@sentry/nextjs'

export async function measurePerformance<T>(
  name: string,
  callback: () => Promise<T>
): Promise<T> {
  const start = performance.now()

  try {
    return await callback()
  } finally {
    const duration = performance.now() - start

    // 2초 이상 걸리면 경고
    if (duration > 2000) {
      console.warn(`[SLOW] ${name} took ${duration.toFixed(0)}ms`)

      Sentry.captureMessage(`Slow operation: ${name}`, {
        level: 'warning',
        extra: { duration: duration.toFixed(0) },
      })
    }
  }
}
```

---

### 2.2 사용 예시

```typescript
import { measurePerformance } from '@/lib/monitoring'

export async function fetchBookings() {
  return measurePerformance('fetchBookings', async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .limit(100)

    return data
  })
}
```

---

## 3. Core Web Vitals 목표

| 지표 | 좋음 | 개선 필요 | 나쁨 |
|------|------|-----------|------|
| **LCP** (Largest Contentful Paint) | <2.5s | 2.5-4s | >4s |
| **FID** (First Input Delay) | <100ms | 100-300ms | >300ms |
| **CLS** (Cumulative Layout Shift) | <0.1 | 0.1-0.25 | >0.25 |

---

## 📊 체크리스트

- [ ] Vercel Analytics 설치
- [ ] app/layout.tsx에 추가
- [ ] lib/monitoring.ts 생성
- [ ] 핵심 작업에 measurePerformance 적용

---

**다음**: [05-CICD.md](./05-CICD.md)
