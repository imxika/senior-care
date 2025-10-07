-- 현재 RLS 상태 확인

-- 1. 각 테이블의 RLS 활성화 여부
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'customers', 'trainers', 'bookings', 'notifications', 'reviews', 'customer_addresses')
ORDER BY tablename;

-- 2. 각 테이블의 정책 개수
SELECT
  tablename,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 3. profiles 테이블의 정책 상세
SELECT
  policyname,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- 4. 현재 로그인된 사용자로 profile 조회 테스트
-- (Supabase 대시보드의 SQL Editor에서 실행할 때 사용)
SELECT
  id,
  email,
  full_name,
  user_type,
  created_at
FROM profiles
WHERE email = 'guest2@test.com';

-- 5. guest2의 customer 레코드 확인
SELECT
  c.id,
  c.profile_id,
  p.email,
  p.user_type
FROM customers c
LEFT JOIN profiles p ON p.id = c.profile_id
WHERE p.email = 'guest2@test.com';
