-- Admin이 모든 프로필을 조회할 수 있도록 수정
-- 순환 참조 제거

-- 기존 정책 삭제
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- 1. 자신의 프로필은 누구나 조회 가능
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 2. Admin은 모든 프로필 조회 가능 (순환 참조 없이)
CREATE POLICY "profiles_select_all_if_admin"
ON profiles FOR SELECT
TO authenticated
USING (
  -- 현재 사용자가 admin인지 직접 확인
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.user_type = 'admin'
  )
);

-- 3. 자신의 프로필 수정
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 4. 트레이너 프로필은 누구나 조회 가능 (공개 정보)
CREATE POLICY "profiles_select_trainers"
ON profiles FOR SELECT
TO authenticated
USING (
  user_type = 'trainer'
);
