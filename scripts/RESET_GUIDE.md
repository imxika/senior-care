# 데이터베이스 초기화 가이드

## 🚨 주의사항
- 이 작업은 **되돌릴 수 없습니다**
- 프로덕션 환경에서는 절대 실행하지 마세요
- Admin 계정은 보존됩니다

## 📝 초기화 순서

### 1단계: 데이터 백업 (선택사항)
```sql
-- 중요한 데이터가 있다면 먼저 백업
COPY (SELECT * FROM bookings) TO '/tmp/bookings_backup.csv' CSV HEADER;
COPY (SELECT * FROM payments) TO '/tmp/payments_backup.csv' CSV HEADER;
```

### 2단계: SQL 스크립트 실행
1. Supabase Dashboard 접속
2. **SQL Editor** 탭 열기
3. `scripts/reset-test-data.sql` 파일 내용 복사
4. SQL Editor에 붙여넣기
5. **RUN** 버튼 클릭

### 3단계: Auth 사용자 삭제 (수동)
SQL로는 auth 사용자를 삭제할 수 없어서 수동으로 해야 합니다:

1. Supabase Dashboard → **Authentication** → **Users**
2. Admin 계정 제외하고 모든 사용자 선택
3. 삭제 버튼 클릭

### 4단계: 확인
스크립트 실행 후 결과 확인:
```
table_name                | remaining_rows
--------------------------|---------------
reviews                   | 0
payments                  | 0
bookings                  | 0
notifications             | 0 (또는 admin 알림만)
trainer_availabilities    | 0
customers                 | 0
trainers                  | 0
profiles                  | 1 (admin만)
```

## 🔄 새로 시작하기

초기화 후 새 계정을 만들어서 테스트하세요:

### 고객 계정 생성
1. 회원가입: `http://localhost:3000/signup`
2. 이메일: `customer@test.com`
3. 비밀번호: `test1234`
4. 사용자 타입: Customer

### 트레이너 계정 생성
1. 회원가입: `http://localhost:3000/signup`
2. 이메일: `trainer@test.com`
3. 비밀번호: `test1234`
4. 사용자 타입: Trainer

### Admin 계정
기존 admin 계정은 그대로 사용 가능합니다.

## 🛠️ 문제 해결

### 외래키 에러가 발생하면?
```sql
-- 모든 테이블을 CASCADE로 초기화
TRUNCATE TABLE reviews, payments, bookings, notifications,
  trainer_availabilities, customers, trainers RESTART IDENTITY CASCADE;

-- profiles는 따로 (auth와 연결)
DELETE FROM profiles WHERE user_type IN ('customer', 'trainer');
```

### Auth 사용자가 남아있어서 로그인이 되면?
1. Dashboard → Authentication → Users
2. 해당 사용자 삭제
3. 또는 profiles 테이블에서 user_type을 수정

### 시퀀스 초기화 (ID를 1부터 다시 시작)
```sql
ALTER SEQUENCE bookings_id_seq RESTART WITH 1;
ALTER SEQUENCE payments_id_seq RESTART WITH 1;
-- 다른 시퀀스도 필요시 초기화
```

## 📊 선택적 삭제

### 특정 날짜 이후 데이터만 삭제
```sql
-- 오늘 생성된 데이터만 삭제
DELETE FROM bookings WHERE created_at::date = CURRENT_DATE;
```

### 특정 상태의 예약만 삭제
```sql
-- 취소된 예약만 삭제
DELETE FROM bookings WHERE status = 'cancelled';
```

### 특정 고객/트레이너 데이터만 삭제
```sql
-- 특정 고객의 모든 데이터 삭제
DELETE FROM bookings WHERE customer_id = 'customer-uuid';
DELETE FROM customers WHERE id = 'customer-uuid';
-- profiles도 삭제하려면
DELETE FROM profiles WHERE id = (
  SELECT profile_id FROM customers WHERE id = 'customer-uuid'
);
```

## 🔍 데이터 확인 쿼리

### 테이블별 데이터 개수
```sql
SELECT
  'bookings' as table_name,
  COUNT(*) as count,
  MAX(created_at) as latest
FROM bookings
UNION ALL
SELECT 'payments', COUNT(*), MAX(created_at) FROM payments
UNION ALL
SELECT 'customers', COUNT(*), MAX(created_at) FROM customers
UNION ALL
SELECT 'trainers', COUNT(*), MAX(created_at) FROM trainers;
```

### 최근 생성된 데이터
```sql
-- 최근 10개 예약
SELECT
  id,
  customer_id,
  booking_type,
  status,
  matching_status,
  created_at
FROM bookings
ORDER BY created_at DESC
LIMIT 10;
```

### Admin 계정 확인
```sql
SELECT
  id,
  email,
  user_type,
  full_name
FROM profiles
WHERE user_type = 'admin';
```
