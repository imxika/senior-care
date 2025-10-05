-- Admin용 RLS 정책 추가
-- 작성일: 2025-10-03
-- 목적: Admin이 모든 데이터를 조회/수정할 수 있도록 정책 추가

-- ====================================
-- Profiles - Admin 정책
-- ====================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;

-- Admin은 모든 프로필 조회 가능
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Admin은 모든 프로필 수정 가능
CREATE POLICY "Admin can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- ====================================
-- Trainers - Admin 정책
-- ====================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admin can view all trainers" ON trainers;
DROP POLICY IF EXISTS "Admin can update all trainers" ON trainers;

-- Admin은 모든 트레이너 조회 가능 (검증 여부 무관)
CREATE POLICY "Admin can view all trainers"
  ON trainers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Admin은 모든 트레이너 수정 가능
CREATE POLICY "Admin can update all trainers"
  ON trainers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- ====================================
-- Customers - Admin 정책
-- ====================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admin can view all customers" ON customers;
DROP POLICY IF EXISTS "Admin can update all customers" ON customers;

-- Admin은 모든 고객 조회 가능
CREATE POLICY "Admin can view all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Admin은 모든 고객 수정 가능
CREATE POLICY "Admin can update all customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- ====================================
-- 코멘트
-- ====================================

COMMENT ON POLICY "Admin can view all profiles" ON profiles IS 'Admin은 모든 사용자 프로필 조회 가능';
COMMENT ON POLICY "Admin can view all trainers" ON trainers IS 'Admin은 검증 여부와 무관하게 모든 트레이너 조회 가능';
COMMENT ON POLICY "Admin can view all customers" ON customers IS 'Admin은 모든 고객 정보 조회 가능';
