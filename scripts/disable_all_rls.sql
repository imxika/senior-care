-- 모든 RLS 일시적으로 비활성화
-- 테스트를 위해 사용하고 나중에 다시 활성화

-- customers 테이블 RLS 비활성화
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- bookings 테이블 RLS 비활성화
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- trainers 테이블 RLS 비활성화
ALTER TABLE trainers DISABLE ROW LEVEL SECURITY;

-- profiles 테이블 RLS 비활성화
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- notifications 테이블 RLS 비활성화
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- reviews 테이블 RLS 비활성화
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;

-- customer_addresses 테이블 RLS 비활성화
ALTER TABLE customer_addresses DISABLE ROW LEVEL SECURITY;

-- 확인
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
