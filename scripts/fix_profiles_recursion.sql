-- profiles 테이블의 순환 참조 정책 수정

-- 1. 문제가 되는 정책 삭제
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;

-- 2. 순환 참조 없는 정책으로 재생성
-- Admin은 자신의 profile에서 user_type을 직접 확인하지 않고
-- JWT 토큰의 이메일로 확인하거나, 별도의 접근 방식 사용

-- 간단한 해결책: Admin도 자신의 프로필만 조회 가능 (profiles_select_own으로 충분)
-- 또는 특정 admin 이메일로 제한

-- 3. 확인
SELECT
  'Profiles policies' as info,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- 4. 테스트: guest2로 조회 가능한지 확인
SELECT
  'Test query' as info,
  COUNT(*) as count
FROM profiles
WHERE id = '892c91bc-438d-4c94-882a-66093d0caad4';
