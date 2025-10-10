# Cron Job 설정 가이드

추천 예약의 24시간 자동 삭제를 위한 cron job 설정 방법입니다.

## 옵션 1: Supabase pg_cron (추천)

Supabase에 내장된 PostgreSQL cron extension을 사용하는 방법입니다.

### 1. pg_cron extension 활성화

Supabase Dashboard에서:
1. `Database` → `Extensions` 이동
2. `pg_cron` 검색하고 활성화

### 2. Cron job 생성

```sql
-- 매시간 0분에 실행 (예: 1:00, 2:00, 3:00...)
SELECT cron.schedule(
  'cleanup-expired-bookings',  -- job name
  '0 * * * *',                  -- every hour at minute 0
  $$SELECT cleanup_expired_bookings()$$
);
```

### 3. Cron job 확인

```sql
-- 등록된 cron job 목록 확인
SELECT * FROM cron.job;

-- Cron job 실행 로그 확인
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-expired-bookings')
ORDER BY start_time DESC
LIMIT 10;
```

### 4. Cron job 삭제 (필요시)

```sql
SELECT cron.unschedule('cleanup-expired-bookings');
```

---

## 옵션 2: Vercel Cron (Next.js API Route)

Vercel에 배포한 경우 Vercel Cron을 사용할 수 있습니다.

### 1. API Route 생성

`app/api/cron/cleanup-bookings/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Verify cron secret (security)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Call cleanup function
  const { data, error } = await supabase.rpc('cleanup_expired_bookings')

  if (error) {
    console.error('Cleanup failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('Cleanup successful:', data)
  return NextResponse.json({
    success: true,
    deleted_count: data[0]?.deleted_count || 0,
    deleted_ids: data[0]?.deleted_booking_ids || []
  })
}
```

### 2. vercel.json 설정

프로젝트 루트에 `vercel.json` 생성:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-bookings",
      "schedule": "0 * * * *"
    }
  ]
}
```

### 3. 환경 변수 설정

Vercel Dashboard에서 `CRON_SECRET` 환경 변수 추가

---

## 옵션 3: 수동 실행

필요할 때마다 Supabase SQL Editor에서 수동 실행:

```sql
SELECT * FROM cleanup_expired_bookings();
```

결과:
```
deleted_count | deleted_booking_ids
--------------+--------------------
3            | {uuid1, uuid2, uuid3}
```

---

## 테스트

### 1. 테스트용 만료된 예약 생성

```sql
-- 25시간 전에 생성된 것처럼 만들기
INSERT INTO bookings (
  customer_id,
  booking_type,
  status,
  booking_date,
  start_time,
  end_time,
  created_at
) VALUES (
  (SELECT id FROM customers LIMIT 1),
  'recommended',
  'pending_payment',
  CURRENT_DATE,
  '10:00:00',
  '11:00:00',
  NOW() - INTERVAL '25 hours'
);
```

### 2. Cleanup 함수 실행

```sql
SELECT * FROM cleanup_expired_bookings();
```

### 3. 삭제 확인

```sql
-- 방금 만든 테스트 데이터가 삭제되었는지 확인
SELECT COUNT(*) FROM bookings
WHERE booking_type = 'recommended'
  AND status = 'pending_payment'
  AND created_at < NOW() - INTERVAL '24 hours';
-- 결과: 0 (모두 삭제됨)
```

---

## 추천 방법

**프로덕션 환경**: 옵션 1 (Supabase pg_cron) 추천
- DB 레벨에서 실행되어 안정적
- 외부 서비스 의존 없음
- Vercel 무료 플랜의 cron job 제한 없음

**개발 환경**: 옵션 3 (수동 실행) 사용
- 필요할 때만 실행
- 디버깅 용이
