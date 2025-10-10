-- =========================================
-- Step 2: bookings Admin SELECT 정책 추가
-- =========================================
-- 목적: Admin이 모든 예약을 조회할 수 있도록 허용
-- 영향: 기존 정책에 추가만 함 (SELECT는 OR 로직이므로 안전)
-- 롤백: 20251010150002_rollback.sql 실행

-- Admin: 모든 예약 조회
CREATE POLICY "bookings_select_by_admin"
ON bookings FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_type = 'admin'
  )
);

-- 검증 쿼리 (실행 후 확인)
-- SELECT policyname, cmd FROM pg_policies
-- WHERE tablename = 'bookings' AND policyname = 'bookings_select_by_admin';
-- 결과: 1개 정책 나와야 함
