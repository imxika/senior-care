# 마이그레이션 관리 가이드

## 현재 상황
- Supabase 호스팅 버전 사용 (supabase.com)
- 마이그레이션 파일: `supabase/migrations/` 디렉토리
- **수동 실행 필요** (자동 적용 안 됨)

## 개발 중 마이그레이션 실행 방법

### 방법 1: Supabase Dashboard (추천 ⭐)
1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. **SQL Editor** 탭 클릭
4. 새 마이그레이션 파일 내용 복사/붙여넣기
5. **Run** 버튼 클릭

**장점:**
- 가장 간단하고 안전
- 에러 즉시 확인 가능
- 실행 기록 남음

### 방법 2: Supabase CLI (로컬 개발)
```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인
supabase login

# 프로젝트 링크
supabase link --project-ref YOUR_PROJECT_REF

# 마이그레이션 푸시
supabase db push
```

**장점:**
- CI/CD 자동화 가능
- 팀 협업에 유리

**단점:**
- 초기 설정 필요

### 방법 3: 자동 실행 스크립트 (개발용)
```typescript
// scripts/run-migrations.ts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ Service Role Key 필요
)

async function runMigrations() {
  const migrationsDir = path.join(process.cwd(), 'supabase/migrations')
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    console.log(`Running ${file}...`)

    const { error } = await supabase.rpc('exec', { sql })
    if (error) {
      console.error(`Error in ${file}:`, error)
    } else {
      console.log(`✅ ${file} completed`)
    }
  }
}

runMigrations()
```

**⚠️ 주의사항:**
- Service Role Key 필요 (절대 공개 금지!)
- 개발 환경에서만 사용
- 프로덕션에서는 Dashboard 사용 권장

## 개발 워크플로우 권장사항

### 현재 상황 (개발 단계)
매번 스키마 변경이 잦으므로:

1. **마이그레이션 파일 생성**
   ```bash
   # 예시
   touch supabase/migrations/20251006030000_add_feature.sql
   ```

2. **파일에 SQL 작성**
   ```sql
   -- 항상 IF NOT EXISTS / IF EXISTS 사용
   ALTER TABLE bookings
     ADD COLUMN IF NOT EXISTS new_field TEXT;
   ```

3. **Supabase Dashboard에서 즉시 실행**
   - SQL Editor → 복사/붙여넣기 → Run

4. **Git 커밋**
   ```bash
   git add supabase/migrations/
   git commit -m "feat: add new_field to bookings"
   ```

### 프로덕션 배포 시
1. **로컬에서 충분히 테스트**
2. **Staging 환경에서 먼저 실행**
3. **프로덕션 DB 백업**
4. **Dashboard에서 마이그레이션 실행**
5. **롤백 SQL 준비**

## 현재 프로젝트의 마이그레이션 파일들

```
supabase/migrations/
├── 20240115_create_notifications.sql
├── 20250104_01_auto_create_customer.sql
├── 20250105_fix_booking_cancel_policy.sql
├── 20251005095601_add_admin_rls_policies.sql
├── 20251005095602_add_booking_types.sql
├── 20251005095603_update_rls_for_recommended_bookings.sql
├── 20251005095604_add_booking_matched_notification.sql
├── 20251005140000_add_notification_settings.sql
├── 20251005150000_add_rejection_reasons_and_availability.sql
├── 20251005160000_fix_recommended_booking_constraint.sql ⭐ (중요!)
├── 20251005170000_auto_approve_bookings.sql
├── 20251006001610_add_booking_timestamps.sql
└── 20251006020000_add_trainer_notes.sql
```

## 최근 이슈: check_recommended_booking 제약 조건

**문제:**
```
new row for relation "bookings" violates check constraint "check_recommended_booking"
```

**원인:**
- 오래된 마이그레이션 (20251005095602) 실행됨
- 새 마이그레이션 (20251005160000) 미실행

**해결:**
Supabase Dashboard에서 실행:
```sql
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS check_recommended_booking;

ALTER TABLE bookings
  ADD CONSTRAINT check_recommended_booking
  CHECK (
    (booking_type = 'direct' AND trainer_id IS NOT NULL) OR
    (booking_type = 'recommended' AND (
      (trainer_id IS NULL AND status = 'pending') OR
      (trainer_id IS NOT NULL)
    ))
  );
```

## 베스트 프랙티스

### ✅ DO
- 마이그레이션 파일명에 타임스탬프 사용
- `IF NOT EXISTS` / `IF EXISTS` 사용으로 멱등성 보장
- 커밋 전 반드시 실행 확인
- 롤백 SQL 함께 작성

### ❌ DON'T
- 이미 실행된 마이그레이션 파일 수정 금지
- 프로덕션 DB에서 직접 테스트 금지
- Service Role Key 코드에 하드코딩 금지

## 자동화 계획 (향후)

### CI/CD 통합 (추천)
```yaml
# .github/workflows/deploy.yml
- name: Run Supabase Migrations
  run: |
    supabase db push
```

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit
# 새 마이그레이션 파일 감지 시 경고
if git diff --cached --name-only | grep "supabase/migrations/"; then
  echo "⚠️  마이그레이션 파일 변경 감지!"
  echo "Supabase Dashboard에서 실행 확인하셨나요?"
  read -p "계속하시겠습니까? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
```

## 참고 자료
- [Supabase Migrations 공식 문서](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [SQL Editor 사용법](https://supabase.com/docs/guides/database/overview#sql-editor)
