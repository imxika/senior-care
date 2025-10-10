-- =========================================
-- RLS 정책 점검 쿼리 (3가지)
-- =========================================
-- Supabase Dashboard → SQL Editor에 전체 복사 → Run
-- =========================================

-- 1. 모든 RLS 정책 확인
SELECT
  tablename,
  policyname,
  cmd,
  CASE
    WHEN length(qual::text) > 50 THEN substring(qual::text, 1, 50) || '...'
    ELSE qual::text
  END as using_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 2. Admin이 실제로 로그인 가능한지 테스트
SELECT * FROM profiles WHERE user_type = 'admin' LIMIT 1;

-- 3. bookings에 Admin 정책이 있는지 확인
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'bookings'
AND policyname LIKE '%admin%';
