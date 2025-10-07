-- Admin RLS 긴급 수정
-- 문제: admin도 자신의 프로필을 못 봄

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_all_if_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_trainers" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- 1. 자신의 프로필은 무조건 조회 가능 (admin 포함)
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 2. Admin은 다른 사람 프로필도 조회 가능
CREATE POLICY "profiles_select_by_admin"
ON profiles FOR SELECT
TO authenticated
USING (
  -- 내가 admin이면 모든 프로필 볼 수 있음
  auth.uid() IN (SELECT id FROM profiles WHERE user_type = 'admin')
);

-- 3. 트레이너 프로필은 공개
CREATE POLICY "profiles_select_trainers"
ON profiles FOR SELECT
TO authenticated
USING (user_type = 'trainer');

-- 4. 자신의 프로필 수정
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
