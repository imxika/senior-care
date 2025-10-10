-- ============================================
-- 테스트 예약 데이터만 안전하게 삭제
-- ============================================
-- ✅ 삭제: 예약, 리뷰, 알림, 트레이너 응답 로그
-- ❌ 유지: 프로필, 고객, 트레이너, 결제 정보
--
-- 실행 전: 꼭 현재 데이터를 확인하세요!
-- SELECT id, customer_id, trainer_id, status, matching_status, created_at
-- FROM bookings
-- WHERE booking_type = 'recommended'
-- ORDER BY created_at DESC;

-- ============================================
-- STEP 1: 백업 테이블 생성 (롤백용)
-- ============================================

-- 기존 백업 테이블이 있으면 삭제
DROP TABLE IF EXISTS bookings_backup_20251010;
DROP TABLE IF EXISTS reviews_backup_20251010;
DROP TABLE IF EXISTS trainer_match_responses_backup_20251010;

-- 현재 recommended 예약 백업
CREATE TABLE bookings_backup_20251010 AS
SELECT * FROM bookings
WHERE booking_type = 'recommended';

-- 관련 리뷰 백업
CREATE TABLE reviews_backup_20251010 AS
SELECT * FROM reviews
WHERE booking_id IN (
  SELECT id FROM bookings WHERE booking_type = 'recommended'
);

-- 트레이너 응답 로그 백업
CREATE TABLE trainer_match_responses_backup_20251010 AS
SELECT * FROM trainer_match_responses
WHERE booking_id IN (
  SELECT id FROM bookings WHERE booking_type = 'recommended'
);

-- 백업된 개수 확인
DO $$
DECLARE
  booking_count INTEGER;
  review_count INTEGER;
  response_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO booking_count FROM bookings_backup_20251010;
  SELECT COUNT(*) INTO review_count FROM reviews_backup_20251010;
  SELECT COUNT(*) INTO response_count FROM trainer_match_responses_backup_20251010;

  RAISE NOTICE '✅ 백업 완료:';
  RAISE NOTICE '  - 예약: % 건', booking_count;
  RAISE NOTICE '  - 리뷰: % 건', review_count;
  RAISE NOTICE '  - 트레이너 응답: % 건', response_count;
END $$;

-- ============================================
-- STEP 2: 관련 데이터 삭제 (순서 중요!)
-- ============================================
-- ❌ profiles, customers, trainers는 삭제하지 않음
-- ✅ 예약 관련 데이터만 삭제

-- 2.1 트레이너 응답 로그 삭제
DELETE FROM trainer_match_responses
WHERE booking_id IN (
  SELECT id FROM bookings WHERE booking_type = 'recommended'
);

-- 2.2 예약 관련 알림만 삭제
DELETE FROM notifications
WHERE link LIKE '%/bookings/%'
AND EXISTS (
  SELECT 1 FROM bookings
  WHERE bookings.id = SUBSTRING(notifications.link FROM '/bookings/([^/]+)')::uuid
  AND bookings.booking_type = 'recommended'
);

-- 2.3 리뷰 삭제 (있다면)
DELETE FROM reviews
WHERE booking_id IN (
  SELECT id FROM bookings WHERE booking_type = 'recommended'
);

-- 2.4 결제 정보는 유지 (실제 결제 데이터일 수 있음)
-- 필요시 주석 해제:
-- DELETE FROM payments
-- WHERE booking_id IN (
--   SELECT id FROM bookings WHERE booking_type = 'recommended'
-- );

-- 2.5 예약 삭제
DELETE FROM bookings
WHERE booking_type = 'recommended';

-- 삭제 결과 확인
DO $$
DECLARE
  remaining_bookings INTEGER;
  remaining_profiles INTEGER;
  remaining_customers INTEGER;
  remaining_trainers INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_bookings FROM bookings WHERE booking_type = 'recommended';
  SELECT COUNT(*) INTO remaining_profiles FROM profiles;
  SELECT COUNT(*) INTO remaining_customers FROM customers;
  SELECT COUNT(*) INTO remaining_trainers FROM trainers;

  RAISE NOTICE '✅ 삭제 완료:';
  RAISE NOTICE '  - recommended 예약: % 건 (삭제됨)', remaining_bookings;
  RAISE NOTICE '';
  RAISE NOTICE '✅ 유지된 데이터:';
  RAISE NOTICE '  - 프로필: % 개', remaining_profiles;
  RAISE NOTICE '  - 고객: % 명', remaining_customers;
  RAISE NOTICE '  - 트레이너: % 명', remaining_trainers;
END $$;

-- ============================================
-- 백업에서 복원하는 방법 (필요시)
-- ============================================
-- 1. 예약 복원
-- INSERT INTO bookings SELECT * FROM bookings_backup_20251010;
--
-- 2. 리뷰 복원
-- INSERT INTO reviews SELECT * FROM reviews_backup_20251010;
--
-- 3. 트레이너 응답 로그 복원
-- INSERT INTO trainer_match_responses SELECT * FROM trainer_match_responses_backup_20251010;
