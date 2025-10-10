# 테스트 데이터 안전 삭제 가이드

## 개요
자동 매칭 시스템 테스트를 위해 기존 데이터를 안전하게 삭제하고 복원하는 방법입니다.

## ⚠️ 주의사항

1. **백업 먼저**: 삭제 전 반드시 백업이 생성되었는지 확인
2. **프로덕션 주의**: 실제 운영 환경에서는 절대 실행하지 마세요
3. **결제 데이터**: 실제 결제가 있는 예약은 삭제하지 않도록 주의

## 실행 순서

### 1단계: 현재 데이터 확인

```sql
-- Supabase SQL Editor에서 실행
SELECT
  id,
  customer_id,
  trainer_id,
  status,
  matching_status,
  created_at,
  total_price
FROM bookings
WHERE booking_type = 'recommended'
ORDER BY created_at DESC;
```

**확인 사항**:
- 몇 건의 예약이 있는지
- 실제 결제가 완료된 예약이 있는지 (total_price 확인)
- 삭제해도 되는 테스트 데이터인지

### 2단계: 백업 및 삭제 실행

```bash
# Terminal에서 실행
cd /Users/seankim/Documents/VScode/_2025/senior-care

# 로컬 DB에 적용
npx supabase migration up --local

# 또는 Supabase Dashboard SQL Editor에서 직접 실행
# supabase/migrations/20251010170000_backup_test_bookings.sql 파일 내용 복사 → 실행
```

**실행 결과 확인**:
```
백업 완료: X 건의 예약이 백업되었습니다
삭제 완료: recommended 예약 잔여 개수 = 0
```

### 3단계: 삭제 확인

```sql
-- 예약이 모두 삭제되었는지 확인
SELECT COUNT(*) FROM bookings WHERE booking_type = 'recommended';
-- 결과: 0

-- 백업 테이블이 생성되었는지 확인
SELECT COUNT(*) FROM bookings_backup_20251010;
-- 결과: X (백업된 개수)
```

## 롤백 방법 (삭제 취소)

실수로 삭제했거나 데이터를 되돌리고 싶을 때:

```bash
# Terminal
npx supabase db execute -f supabase/migrations/20251010170000_rollback.sql --local

# 또는 Supabase Dashboard SQL Editor에서
# 20251010170000_rollback.sql 파일 내용 실행
```

## 새로운 테스트 데이터 생성

데이터 삭제 후 새로운 테스트를 위해:

### 방법 1: UI에서 추천 예약 생성
1. `/booking/recommended` 페이지에서 새 예약 생성
2. 결제 완료
3. 자동 매칭 시스템이 30분 타이머 시작

### 방법 2: SQL로 직접 생성 (테스트용)

```sql
-- 테스트 고객 ID 확인
SELECT id FROM customers LIMIT 1;

-- 새 추천 예약 생성
INSERT INTO bookings (
  customer_id,
  booking_type,
  service_type,
  booking_date,
  start_time,
  end_time,
  duration_minutes,
  session_type,
  status,
  matching_status,
  total_price,
  customer_notes
) VALUES (
  'YOUR_CUSTOMER_ID',  -- 위에서 확인한 고객 ID
  'recommended',
  'home_visit',
  CURRENT_DATE + 2,  -- 2일 후
  '14:00:00',
  '15:30:00',
  90,
  '1:1',
  'pending',
  'pending',
  75000,
  '테스트 예약입니다'
);
```

## 삭제되는 데이터

1. ✅ `trainer_match_responses` - 트레이너 응답 로그
2. ✅ `notifications` - 예약 관련 알림
3. ✅ `reviews` - 예약 리뷰
4. ❌ `payments` - 결제 정보 (기본적으로 유지, 필요시 주석 해제)
5. ✅ `bookings` - recommended 타입 예약

## 트러블슈팅

### 문제: "백업 테이블이 이미 존재합니다"
```sql
-- 기존 백업 테이블 삭제 후 재실행
DROP TABLE IF EXISTS bookings_backup_20251010;
```

### 문제: "외래 키 제약 위반"
- 스크립트가 올바른 순서로 삭제하므로 발생하지 않아야 함
- 발생 시: 스크립트를 처음부터 다시 실행

### 문제: "권한 없음"
```sql
-- Admin으로 로그인했는지 확인
SELECT auth.uid(), user_type FROM profiles WHERE id = auth.uid();
```

## 백업 테이블 관리

테스트가 끝나고 더 이상 백업이 필요 없을 때:

```sql
-- 백업 테이블 삭제
DROP TABLE IF EXISTS bookings_backup_20251010;
```

## 체크리스트

삭제 전:
- [ ] 현재 데이터 확인 완료
- [ ] 실제 운영 데이터가 아닌지 확인
- [ ] 백업이 필요한지 판단

삭제 후:
- [ ] `bookings_backup_20251010` 테이블 존재 확인
- [ ] recommended 예약 개수 = 0 확인
- [ ] 새 테스트 예약 생성 준비

복원 시:
- [ ] 롤백 스크립트 실행
- [ ] 데이터 개수 일치 확인
- [ ] 관련 데이터 정상 복원 확인
