-- Profiles RLS 단순화
-- 순환 참조 완전 제거

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_all_if_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_by_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_trainers" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- RLS 비활성화
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 다시 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. 자신의 프로필은 무조건 볼 수 있음
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 2. 트레이너 프로필은 공개 (누구나 볼 수 있음)
CREATE POLICY "profiles_select_trainers_public"
ON profiles FOR SELECT
TO authenticated
USING (user_type = 'trainer');

-- 3. 자신의 프로필 수정
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 4. Admin은 service role로 접근하도록 함
-- application에서 createClient with service role key 사용
