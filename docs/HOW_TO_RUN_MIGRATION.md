# 🚀 알림 시스템 수정 마이그레이션 실행 가이드

## 📋 개요
알림 기능이 작동하지 않는 문제를 해결하기 위한 DB 마이그레이션입니다.

**문제**:
- 코드는 `link` 컬럼 사용 → DB에는 없음
- 새로운 알림 타입 4개 → CHECK 제약 조건에 없음

**해결**:
- `link` 컬럼 추가
- CHECK 제약 조건에 4개 타입 추가

---

## 🔧 실행 방법

### Option 1: Supabase Dashboard (추천 ✅)

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택: `senior-care` (또는 본인 프로젝트명)

2. **SQL Editor 열기**
   - 왼쪽 메뉴 → `SQL Editor` 클릭
   - 또는 단축키: `Ctrl/Cmd + K` → "SQL Editor" 검색

3. **SQL 복사 & 붙여넣기**
   ```bash
   # 파일 내용 복사
   cat supabase/migrations/20251011_fix_notifications_schema.sql
   ```

4. **실행**
   - SQL Editor에 붙여넣기
   - `Run` 버튼 클릭 (또는 `Ctrl/Cmd + Enter`)

5. **결과 확인**
   ```
   ✅ Success: Command completed successfully
   ```

---

### Option 2: 로컬 Supabase CLI (개발 환경)

```bash
# Supabase CLI 설치 확인
supabase --version

# 로컬 DB에 적용
supabase db push

# 또는 직접 실행
supabase db execute -f supabase/migrations/20251011_fix_notifications_schema.sql
```

---

## ✅ 실행 후 확인

### 1. 테이블 스키마 확인
```sql
-- SQL Editor에서 실행
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;
```

**기대 결과**:
```
column_name     | data_type
----------------|----------
id              | uuid
user_id         | uuid
title           | text
message         | text
type            | text
related_id      | uuid      ← 레거시 (사용 안함)
link            | text      ← 새로 추가됨 ✅
is_read         | boolean
created_at      | timestamp
read_at         | timestamp
```

### 2. CHECK 제약 조건 확인
```sql
-- SQL Editor에서 실행
SELECT conname, consrc
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
AND contype = 'c';
```

**기대 결과**:
```
notifications_type_check | (type = ANY (ARRAY[
  'booking_confirmed'::text,
  'booking_cancelled'::text,
  'booking_completed'::text,
  'booking_pending'::text,
  'booking_rejected'::text,
  'system'::text,
  'booking_matched'::text,        ← 새로 추가됨 ✅
  'booking_request'::text,        ← 새로 추가됨 ✅
  'booking_request_closed'::text, ← 새로 추가됨 ✅
  'auto_match_timeout'::text      ← 새로 추가됨 ✅
]))
```

---

## 🧪 알림 기능 테스트

마이그레이션 실행 후 다음 시나리오로 테스트:

### 1. 직접 예약 알림
1. 고객으로 로그인
2. 트레이너 선택 → 예약 생성 → 결제 완료
3. 트레이너로 로그인
4. 🔔 알림 확인: "새로운 예약 요청"

### 2. 예약 승인 알림
1. 트레이너로 로그인
2. 예약 요청 승인
3. 고객으로 로그인
4. 🔔 알림 확인: "예약이 확정되었습니다"

### 3. 추천 예약 매칭 알림
1. 고객으로 로그인
2. 추천 예약 생성 → 결제 완료
3. 트레이너로 로그인 (여러 명)
4. 🔔 알림 확인: "새로운 예약 요청 (선착순)"

---

## ❌ 문제 해결

### "constraint already exists" 에러
```sql
-- 기존 제약 조건 완전 삭제 후 재실행
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check CASCADE;
```

### "column already exists" 에러
```
정상입니다! IF NOT EXISTS 때문에 안전하게 무시됩니다.
```

### 알림이 여전히 안 옴
1. 브라우저 콘솔 확인 (F12)
2. Network 탭에서 Supabase Realtime 연결 확인
3. 알림 권한 확인 (브라우저 설정)

---

## 📝 변경 사항 요약

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 컬럼 | related_id (UUID) | related_id + **link (TEXT)** ✅ |
| 알림 타입 | 6개 | **10개** ✅ |
| 코드 호환성 | ❌ 불일치 | ✅ 완벽 일치 |
| 알림 기능 | ❌ 작동 안함 | ✅ 완전 작동 |

---

**작성일**: 2025-10-11
**작성자**: Claude Code
**관련 이슈**: 알림 시스템 DB 스키마 불일치
