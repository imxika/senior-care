-- bookings 테이블 RLS 정책 정리 및 수정
-- 중복된 정책들을 제거하고 명확한 정책만 유지

-- 기존의 모든 bookings 정책 삭제
DROP POLICY IF EXISTS "Customers can create bookings" ON bookings;
DROP POLICY IF EXISTS "고객은 예약 생성 가능" ON bookings;
DROP POLICY IF EXISTS "Customers can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Trainers can view own bookings" ON bookings;
DROP POLICY IF EXISTS "고객은 본인 예약만 조회" ON bookings;
DROP POLICY IF EXISTS "트레이너는 본인 예약만 조회" ON bookings;
DROP POLICY IF EXISTS "관리자는 모든 예약 조회" ON bookings;
DROP POLICY IF EXISTS "고객은 본인 예약 취소 가능" ON bookings;
DROP POLICY IF EXISTS "Customers can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Trainers can update own bookings" ON bookings;
DROP POLICY IF EXISTS "관리자는 모든 예약 수정 가능" ON bookings;
DROP POLICY IF EXISTS "트레이너는 본인 예약 상태 변경 가능" ON bookings;

-- RLS 활성화
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SELECT 정책
-- ============================================

-- 고객: 자신의 예약 조회
CREATE POLICY "bookings_select_customer"
ON bookings
FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT id FROM customers WHERE profile_id = auth.uid()
  )
);

-- 트레이너: 자신의 예약 + 매칭 대기중인 추천 예약 조회
CREATE POLICY "bookings_select_trainer"
ON bookings
FOR SELECT
TO authenticated
USING (
  trainer_id IN (
    SELECT id FROM trainers WHERE profile_id = auth.uid()
  )
  OR (
    booking_type = 'recommended'
    AND trainer_id IS NULL
    AND status = 'pending'
  )
);

-- Admin: 모든 예약 조회
CREATE POLICY "bookings_select_admin"
ON bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- ============================================
-- INSERT 정책
-- ============================================

-- 고객: 자신의 예약 생성
CREATE POLICY "bookings_insert_customer"
ON bookings
FOR INSERT
TO authenticated
WITH CHECK (
  customer_id IN (
    SELECT id FROM customers WHERE profile_id = auth.uid()
  )
  AND (
    (booking_type = 'direct' AND trainer_id IS NOT NULL)
    OR (booking_type = 'recommended' AND trainer_id IS NULL)
  )
);

-- ============================================
-- UPDATE 정책
-- ============================================

-- 고객: 자신의 예약 수정 (취소 포함)
CREATE POLICY "bookings_update_customer"
ON bookings
FOR UPDATE
TO authenticated
USING (
  customer_id IN (
    SELECT id FROM customers WHERE profile_id = auth.uid()
  )
)
WITH CHECK (
  customer_id IN (
    SELECT id FROM customers WHERE profile_id = auth.uid()
  )
);

-- 트레이너: 자신의 예약 수정 (상태 변경 등)
CREATE POLICY "bookings_update_trainer"
ON bookings
FOR UPDATE
TO authenticated
USING (
  trainer_id IN (
    SELECT id FROM trainers WHERE profile_id = auth.uid()
  )
)
WITH CHECK (
  trainer_id IN (
    SELECT id FROM trainers WHERE profile_id = auth.uid()
  )
);

-- Admin: 모든 예약 수정
CREATE POLICY "bookings_update_admin"
ON bookings
FOR UPDATE
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

-- ============================================
-- DELETE 정책 (필요한 경우)
-- ============================================

-- Admin만 예약 삭제 가능
CREATE POLICY "bookings_delete_admin"
ON bookings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- 확인 쿼리
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'bookings' ORDER BY cmd, policyname;
