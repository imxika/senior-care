-- =========================================
-- Step 3: bookings Admin UPDATE 정책 추가
-- =========================================
-- 목적: Admin이 모든 예약을 수정할 수 있도록 허용
-- 영향: 기존 정책에 추가만 함 (UPDATE는 OR 로직이므로 안전)
-- 롤백: 20251010150003_rollback.sql 실행

-- Admin: 모든 예약 수정
CREATE POLICY "bookings_update_by_admin"
ON bookings FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_type = 'admin'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_type = 'admin'
  )
);

-- 검증 쿼리 (실행 후 확인)
-- SELECT policyname, cmd FROM pg_policies
-- WHERE tablename = 'bookings' AND policyname = 'bookings_update_by_admin';
-- 결과: 1개 정책 나와야 함
