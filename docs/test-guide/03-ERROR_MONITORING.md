# 03. 에러 모니터링 완벽 가이드 (Sentry)

> **목표**: 프로덕션 에러를 실시간으로 추적하고 알림 받기

---

## 📋 목차

1. [Sentry 설정](#1-sentry-설정)
2. [에러 바운더리](#2-에러-바운더리)
3. [Server Action 에러 추적](#3-server-action-에러-추적)
4. [알림 설정](#4-알림-설정)

---

## 1. Sentry 설정

### 1.1 Sentry 계정 생성 (5분)

1. https://sentry.io 회원가입 (무료)
2. 새 프로젝트 생성
3. Platform: **Next.js** 선택
4. DSN 키 복사 (나중에 사용)

---

### 1.2 Sentry 설치 (10분)

```bash
npx @sentry/wizard@latest -i nextjs
```

**자동으로 생성되는 파일:**
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `next.config.ts` (Sentry 플러그인 추가)

---

### 1.3 환경변수 설정

**파일: `.env.local`**

```bash
NEXT_PUBLIC_SENTRY_DSN=https://your-key@o1234567.ingest.sentry.io/1234567
SENTRY_AUTH_TOKEN=sntrys_your_token_here
```

**파일: `.gitignore`에 추가**

```
.env.local
.sentryclirc
```

---

### 1.4 Client 설정 커스터마이징

**파일: `sentry.client.config.ts`**

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 환경 구분
  environment: process.env.NODE_ENV,

  // 샘플링 (프로덕션 100%, 개발 10%)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0.1,

  // 에러 필터링
  beforeSend(event, hint) {
    // 개발 환경에서는 콘솔만
    if (process.env.NODE_ENV === 'development') {
      console.error(hint.originalException || hint.syntheticException)
      return null
    }

    // 404 에러 제외
    if (event.exception?.values?.[0]?.value?.includes('404')) {
      return null
    }

    return event
  },

  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', /^https:\/\/your-domain\.com/],
    }),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // 세션 리플레이 (에러 발생 시 100% 녹화)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})
```

---

## 2. 에러 바운더리

### 2.1 페이지 레벨 에러 바운더리

**파일: `app/error.tsx`**

```typescript
'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Sentry에 에러 전송
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">
          문제가 발생했습니다
        </h2>
        <p className="text-gray-600 mb-6">
          죄송합니다. 예상치 못한 오류가 발생했습니다.
          {error.digest && (
            <><br />
            <span className="text-sm text-gray-400">
              오류 코드: {error.digest}
            </span></>
          )}
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => reset()}>
            다시 시도
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            홈으로
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

### 2.2 전역 에러 바운더리

**파일: `app/global-error.tsx`**

```typescript
'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>치명적인 오류가 발생했습니다</h2>
          <p>관리자에게 문의해주세요.</p>
        </div>
      </body>
    </html>
  )
}
```

---

## 3. Server Action 에러 추적

### 3.1 에러 추적 유틸리티

**파일: `lib/sentry-utils.ts`**

```typescript
import * as Sentry from '@sentry/nextjs'

export function captureServerActionError(
  error: unknown,
  context: {
    action: string
    userId?: string
    metadata?: Record<string, any>
  }
) {
  Sentry.captureException(error, {
    tags: {
      action: context.action,
      type: 'server-action',
    },
    user: context.userId ? { id: context.userId } : undefined,
    extra: context.metadata,
  })

  console.error(`[${context.action}] Error:`, error)
}
```

---

### 3.2 Server Action에서 사용

**파일: `app/(public)/trainers/[id]/booking/actions.ts`**

```typescript
'use server'

import { captureServerActionError } from '@/lib/sentry-utils'
import { createClient } from '@/lib/supabase/server'

export async function createBooking(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: '로그인이 필요합니다.' }
    }

    // ... 예약 로직 ...

    return { success: true, data: booking }

  } catch (error) {
    // Sentry에 에러 전송
    captureServerActionError(error, {
      action: 'createBooking',
      userId: user?.id,
      metadata: {
        trainer_id: formData.get('trainer_id'),
        date: formData.get('date'),
      }
    })

    return { error: '예약 생성 중 오류가 발생했습니다.' }
  }
}
```

---

## 4. 알림 설정

### 4.1 Sentry Dashboard 설정

1. **Sentry.io 로그인** → 프로젝트 선택
2. **Settings → Alerts → New Alert Rule**

**알림 조건 설정:**
```
이름: "Critical Errors"

조건:
- 에러가 처음 발생했을 때
- 동일 에러가 10분에 5회 이상
- /checkout, /payment URL에서 에러

알림 방법:
- 이메일 (즉시)
- Slack (추천)
```

---

### 4.2 Slack 연동 (추천)

1. **Sentry → Settings → Integrations → Slack**
2. **Workspace 연결**
3. **채널 선택** (예: #dev-alerts)
4. **테스트 알림 전송**

**알림 예시:**
```
🔴 [senior-care] New Error in production

Error: Cannot read property 'id' of undefined
File: app/(public)/trainers/[id]/page.tsx:42
User: user@example.com
Frequency: 5 events in 10 minutes

View in Sentry →
```

---

## 📊 체크리스트

- [ ] Sentry 계정 생성
- [ ] npx @sentry/wizard 실행 완료
- [ ] 환경변수 설정
- [ ] app/error.tsx 생성
- [ ] app/global-error.tsx 생성
- [ ] lib/sentry-utils.ts 생성
- [ ] Server Action에 에러 추적 추가
- [ ] Slack 알림 설정

---

**다음**: [04-PERFORMANCE_MONITORING.md](./04-PERFORMANCE_MONITORING.md)
