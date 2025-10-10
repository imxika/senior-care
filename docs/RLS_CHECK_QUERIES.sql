-- =========================================
-- RLS 정책 전체 점검 쿼리
-- =========================================
-- 작성일: 2025-10-10
-- 목적: 현재 DB의 RLS 정책 상태 확인
-- 실행 방법: Supabase Dashboard → SQL Editor에 전체 복사 → Run
-- =========================================

-- =========================================
-- 1. 모든 RLS 정책 확인
-- =========================================
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

-- =========================================
-- 2. Admin 로그인 테스트
-- =========================================
-- 주의: Admin 계정으로 로그인한 상태에서 실행하세요
-- 만약 결과가 없으면 순환 참조 문제로 조회 실패한 것입니다
SELECT
  id,
  email,
  user_type,
  full_name,
  created_at
FROM profiles
WHERE user_type = 'admin'
LIMIT 1;

-- =========================================
-- 3. bookings 테이블 Admin 정책 확인
-- =========================================
SELECT
  policyname,
  cmd,
  CASE
    WHEN length(qual::text) > 100 THEN substring(qual::text, 1, 100) || '...'
    ELSE qual::text
  END as using_clause,
  CASE
    WHEN length(with_check::text) > 100 THEN substring(with_check::text, 1, 100) || '...'
    ELSE with_check::text
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'bookings'
AND (policyname LIKE '%admin%' OR policyname LIKE '%Admin%');

-- =========================================
-- 4. 추가 확인: trainer_match_responses 정책
-- =========================================
SELECT
  policyname,
  cmd,
  CASE
    WHEN length(qual::text) > 80 THEN substring(qual::text, 1, 80) || '...'
    ELSE qual::text
  END as using_clause
FROM pg_policies
WHERE tablename = 'trainer_match_responses'
ORDER BY cmd, policyname;

-- =========================================
-- 5. 추가 확인: 모든 테이블의 RLS 활성화 상태
-- =========================================
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'profiles', 'customers', 'trainers', 'bookings',
  'reviews', 'customer_addresses', 'notifications',
  'trainer_match_responses'
)
ORDER BY tablename;

-- =========================================
-- 6. 추가 확인: 각 테이블별 정책 개수
-- =========================================
SELECT
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(DISTINCT cmd::text, ', ') as operations
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- =========================================
-- 결과 해석 가이드
-- =========================================
--
-- [쿼리 1] 모든 RLS 정책 확인
-- - 각 테이블별로 몇 개의 정책이 있는지 확인
-- - using_clause에 "profiles" 서브쿼리가 있으면 순환 참조 의심
--
-- [쿼리 2] Admin 로그인 테스트
-- - 결과가 나오면 OK
-- - 결과가 없거나 에러 발생하면 순환 참조 문제 확인됨
--
-- [쿼리 3] bookings Admin 정책 확인
-- - 결과가 없으면 Admin이 bookings 관리 불가 (문제!)
-- - 결과가 있으면 정책 내용 확인 필요
--
-- [쿼리 4] trainer_match_responses 정책
-- - 새로 추가된 테이블의 정책 확인
-- - SELECT, INSERT 정책 최소 2개 이상 있어야 함
--
-- [쿼리 5] RLS 활성화 상태
-- - rls_enabled = true 여야 정상
-- - false면 RLS가 비활성화된 것 (보안 문제!)
--
-- [쿼리 6] 테이블별 정책 개수
-- - bookings: 최소 4개 (customer select/update, trainer select/update)
-- - profiles: 최소 4개 (select own/trainers/customers, update own, insert)
-- - notifications: 3개 (select, update, insert)
--
-- =========================================
