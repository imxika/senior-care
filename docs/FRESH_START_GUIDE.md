# 🎯 처음부터 다시 시작하기 - 완전 가이드

자동 매칭 시스템을 깨끗한 상태에서 처음부터 테스트하는 방법입니다.

## 📋 체크리스트

- [ ] 1단계: 현재 데이터 확인
- [ ] 2단계: 전체 백업 및 삭제
- [ ] 3단계: 삭제 확인
- [ ] 4단계: 새 테스트 예약 생성
- [ ] 5단계: 자동 매칭 테스트
- [ ] 6단계: 수동 매칭 테스트 (필요시)

---

## 1단계: 현재 데이터 확인 ✅

### Supabase Dashboard에서 실행:

```bash
# 파일 열기
/Users/seankim/Documents/VScode/_2025/senior-care/docs/CHECK_CURRENT_DATA.sql
```

**확인 사항**:
- 총 예약 개수
- 총 결제 개수
- 리뷰, 알림, 트레이너 응답 개수
- 사용자 수 (프로필, 고객, 트레이너) ← **이건 유지됨**

**예상 결과**:
```
예약 현황: 56건
결제 현황: 9건
리뷰 현황: X건
트레이너 응답: X건
알림 현황: X건
사용자: 프로필 X개, 고객 X명, 트레이너 X명
```

---

## 2단계: 전체 백업 및 삭제 🗑️

### ⚠️ 주의사항
- **실제 운영 데이터가 있다면 절대 실행하지 마세요!**
- 백업이 자동으로 생성되니 안심하세요
- 언제든 롤백 가능합니다

### Supabase Dashboard SQL Editor에서 실행:

1. 파일 열기:
   ```
   /Users/seankim/Documents/VScode/_2025/senior-care/supabase/migrations/20251010180000_clean_all_test_data.sql
   ```

2. 전체 내용 복사 → SQL Editor에 붙여넣기

3. **Run** 버튼 클릭

4. 결과 확인:
   ```
   ✅ 전체 백업 완료:
     - 예약: 56 건
     - 결제: 9 건
     - 리뷰: X 건
     - 트레이너 응답: X 건
     - 알림: X 건

   ✅ 삭제 완료:
     - 예약: 0 건
     - 결제: 0 건
     - 리뷰: 0 건
     - 트레이너 응답: 0 건
     - 알림: 0 건

   ✅ 유지된 데이터:
     - 프로필: X 개
     - 고객: X 명
     - 트레이너: X 명

   🎉 테스트 데이터 정리 완료!
   ```

---

## 3단계: 삭제 확인 ✅

### Admin 대시보드에서 확인:

1. **예약 관리** (`/admin/bookings`)
   - 전체 예약: **0건** ✅
   - 승인 대기: **0건** ✅

2. **결제 관리** (`/admin/payments`)
   - 전체 결제: **0건** ✅

3. **자동 매칭 모니터** (`/admin/bookings/auto-matching`)
   - 자동 매칭 진행 중: **0건** ✅
   - Admin 개입 필요: **0건** ✅

### SQL로 확인 (선택사항):

```sql
-- 모든 테이블이 비어있는지 확인
SELECT
  (SELECT COUNT(*) FROM bookings) as bookings,
  (SELECT COUNT(*) FROM payments) as payments,
  (SELECT COUNT(*) FROM reviews) as reviews,
  (SELECT COUNT(*) FROM trainer_match_responses) as responses,
  (SELECT COUNT(*) FROM notifications) as notifications;

-- 결과: 모두 0이어야 함
```

---

## 4단계: 새 테스트 예약 생성 🆕

### 방법 A: UI에서 생성 (추천) 👍

1. **고객 계정으로 로그인**
   - 이메일: `guest2@test.com` (또는 다른 고객 계정)

2. **추천 예약 페이지 이동**
   - URL: `/booking/recommended`

3. **예약 정보 입력**:
   ```
   서비스 유형: 방문 서비스
   예약 날짜: 내일 또는 모레
   시작 시간: 14:00
   종료 시간: 15:30 (90분)
   세션 유형: 1:1
   주소: 서울시 강남구 테헤란로 123
   요청사항: 자동 매칭 테스트입니다
   ```

4. **결제 진행**
   - 테스트 카드 번호 사용
   - 결제 완료 확인

5. **결제 성공 페이지 확인**
   - "예약이 완료되었습니다"
   - "곧 적합한 트레이너를 찾아드릴게요"

### 방법 B: SQL로 생성 (빠른 테스트용)

```sql
-- 1. 고객 ID 확인
SELECT c.id, p.full_name, p.email
FROM customers c
JOIN profiles p ON c.profile_id = p.id
LIMIT 1;

-- 2. 새 예약 생성
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
  'YOUR_CUSTOMER_ID',  -- 위에서 확인한 ID
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
  '자동 매칭 테스트'
) RETURNING id;

-- 3. 결제 레코드 생성 (선택사항)
INSERT INTO payments (
  booking_id,
  customer_id,
  amount,
  payment_method,
  payment_status,
  provider,
  provider_payment_key
) VALUES (
  'BOOKING_ID_FROM_ABOVE',
  'YOUR_CUSTOMER_ID',
  75000,
  'card',
  'paid',
  'toss',
  'test_payment_' || NOW()::text
);
```

---

## 5단계: 자동 매칭 테스트 🤖

### 5.1 Admin 대시보드 확인

1. **자동 매칭 모니터** 이동
   - URL: `/admin/bookings/auto-matching`

2. **"자동 매칭 진행 중" 섹션 확인**:
   ```
   예약 #1
   고객: [고객명]
   일시: [예약 날짜/시간]
   알림 발송: 방금 전
   남은 시간: 약 30분
   대기 중인 트레이너: 3명
   ```

### 5.2 트레이너 응답 대기 (30분)

**옵션 1: 실제로 30분 대기**
- 트레이너 계정으로 로그인해서 수락/거절 테스트
- 알림이 제대로 가는지 확인

**옵션 2: 타임아웃 테스트**
- 30분 기다리면 자동으로 "Admin 개입 필요"로 이동
- Admin 알림 받는지 확인

**옵션 3: 시간 단축 (개발용)**
```sql
-- auto_match_deadline을 1분 후로 변경
UPDATE bookings
SET
  notified_at = NOW() - INTERVAL '29 minutes',
  auto_match_deadline = NOW() + INTERVAL '1 minute'
WHERE matching_status = 'pending'
AND booking_type = 'recommended';
```

### 5.3 자동 매칭 성공 시나리오

트레이너가 수락하면:
- "자동 매칭 진행 중" → "최근 24시간 매칭 성공" 섹션으로 이동
- 고객에게 "트레이너가 매칭되었습니다" 알림
- 트레이너에게 "새 예약이 배정되었습니다" 알림

---

## 6단계: 수동 매칭 테스트 👨‍💼

### 타임아웃 후 수동 매칭

1. **"Admin 개입 필요" 섹션에서 예약 확인**

2. **"수동 매칭하기" 버튼 클릭**

3. **트레이너 목록 확인**:
   - 매칭 점수순으로 정렬됨
   - 최고 매칭 트레이너 표시됨

4. **트레이너 선택 → "이 트레이너로 매칭" 클릭**

5. **성공 토스트 확인**:
   - "트레이너 매칭 완료!"
   - "트레이너에게 승인 요청을 보냈습니다"

6. **예약 상세 페이지로 이동**:
   - status: `confirmed`
   - matching_status: `matched`

---

## 🔄 롤백 방법 (실수 시)

삭제를 취소하고 원래 데이터로 되돌리려면:

### Supabase Dashboard SQL Editor에서:

```bash
# 파일 열기
/Users/seankim/Documents/VScode/_2025/senior-care/supabase/migrations/20251010180000_rollback.sql
```

**실행 결과**:
```
✅ 복원 완료:
  - 예약: 56 건
  - 결제: 9 건
  - 리뷰: X 건
  - 트레이너 응답: X 건
  - 알림: X 건
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 자동 매칭 성공
1. 새 예약 생성 + 결제
2. 트레이너 3명에게 알림 발송
3. 트레이너 1명이 10분 후 수락
4. 고객과 트레이너에게 매칭 완료 알림
5. **예상 결과**: status = `confirmed`, matching_status = `approved`

### 시나리오 2: 자동 매칭 타임아웃
1. 새 예약 생성 + 결제
2. 트레이너 3명에게 알림 발송
3. 30분 동안 아무도 수락 안 함
4. Admin에게 타임아웃 알림
5. **예상 결과**: fallback_to_admin = `true`, Admin 개입 필요 섹션에 표시

### 시나리오 3: 수동 매칭
1. 타임아웃된 예약에서 "수동 매칭하기" 클릭
2. 트레이너 목록에서 최고 매칭 선택
3. 매칭 완료
4. **예상 결과**: admin_matched_at 값 존재, status = `confirmed`

### 시나리오 4: 예약 취소
1. Admin 개입 필요 섹션에서 "취소" 버튼 클릭
2. 확인 다이얼로그 → "예약 취소" 클릭
3. 성공 토스트 + 다이얼로그 닫힘
4. 페이지 새로고침 → 목록에서 사라짐
5. **예상 결과**: status = `cancelled`

---

## 📊 예상 결과

### 깨끗한 시작 후:
- 예약 관리: **1건** (새로 생성한 것)
- 결제 관리: **1건** (새 결제)
- 자동 매칭 진행 중: **1건**
- Admin 개입 필요: **0건** (타임아웃 전)

### 30분 후 (타임아웃):
- 자동 매칭 진행 중: **0건**
- Admin 개입 필요: **1건**

### 수동 매칭 완료 후:
- Admin 개입 필요: **0건**
- 예약 관리 → 확정: **1건**

---

## 🐛 트러블슈팅

### 문제 1: "백업 테이블이 이미 존재합니다"
```sql
-- 기존 백업 삭제 후 재실행
DROP TABLE IF EXISTS bookings_backup_full;
DROP TABLE IF EXISTS payments_backup_full;
DROP TABLE IF EXISTS reviews_backup_full;
DROP TABLE IF EXISTS trainer_match_responses_backup_full;
DROP TABLE IF EXISTS notifications_backup_full;
```

### 문제 2: 알림이 안 옴
- Edge Function이 실행 중인지 확인
- Supabase Logs 확인
- `notifications` 테이블에 데이터 있는지 확인

### 문제 3: 자동 매칭이 시작 안 됨
```sql
-- Edge Function 트리거 확인
SELECT * FROM bookings
WHERE booking_type = 'recommended'
AND matching_status = 'pending';

-- notified_at이 NULL이면 수동 트리거:
UPDATE bookings
SET
  notified_at = NOW(),
  auto_match_deadline = NOW() + INTERVAL '30 minutes',
  pending_trainer_ids = ARRAY['trainer_id_1', 'trainer_id_2', 'trainer_id_3']
WHERE id = 'YOUR_BOOKING_ID';
```

---

## ✅ 성공 체크리스트

모든 단계가 완료되면:
- [x] 예약 56건 → 0건 → 1건 (새 예약)
- [x] 결제 9건 → 0건 → 1건 (새 결제)
- [x] 자동 매칭 진행 중 1건 표시됨
- [x] 30분 타이머 정상 작동
- [x] 타임아웃 후 Admin 개입 필요로 이동
- [x] 수동 매칭 성공
- [x] 취소 버튼 정상 작동
- [x] 토스트 메시지 표시됨
- [x] 사이드바에 "자동 매칭 모니터" 링크 있음

**축하합니다! 🎉 자동 매칭 시스템이 완벽하게 작동합니다!**
