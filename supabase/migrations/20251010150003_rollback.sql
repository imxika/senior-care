-- =========================================
-- Step 3 롤백: bookings Admin UPDATE 정책 제거
-- =========================================
-- 실행 조건: Step 3 실행 후 문제 발생 시

-- 정책 삭제
DROP POLICY IF EXISTS "bookings_update_by_admin" ON bookings;

-- 검증 쿼리
-- SELECT policyname FROM pg_policies
-- WHERE tablename = 'bookings' AND policyname = 'bookings_update_by_admin';
-- 결과: 0개여야 함
