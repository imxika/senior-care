-- ============================================
-- 모든 테스트 데이터 정리 (프로필/사용자는 유지)
-- ============================================
-- ✅ 삭제: 예약, 결제, 리뷰, 알림, 트레이너 응답
-- ❌ 유지: profiles, customers, trainers, customer_addresses
--
-- ⚠️ 주의: 실제 운영 데이터가 있다면 실행하지 마세요!

-- ============================================
-- STEP 1: 백업 테이블 생성
-- ============================================

-- 기존 백업 테이블 삭제
DROP TABLE IF EXISTS bookings_backup_full;
DROP TABLE IF EXISTS payments_backup_full;
DROP TABLE IF EXISTS reviews_backup_full;
DROP TABLE IF EXISTS trainer_match_responses_backup_full;
DROP TABLE IF EXISTS notifications_backup_full;

-- 전체 백업
CREATE TABLE bookings_backup_full AS SELECT * FROM bookings;
CREATE TABLE payments_backup_full AS SELECT * FROM payments;
CREATE TABLE reviews_backup_full AS SELECT * FROM reviews;
CREATE TABLE trainer_match_responses_backup_full AS SELECT * FROM trainer_match_responses;
CREATE TABLE notifications_backup_full AS SELECT * FROM notifications;

-- 백업 확인
DO $$
DECLARE
  booking_count INTEGER;
  payment_count INTEGER;
  review_count INTEGER;
  response_count INTEGER;
  notification_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO booking_count FROM bookings_backup_full;
  SELECT COUNT(*) INTO payment_count FROM payments_backup_full;
  SELECT COUNT(*) INTO review_count FROM reviews_backup_full;
  SELECT COUNT(*) INTO response_count FROM trainer_match_responses_backup_full;
  SELECT COUNT(*) INTO notification_count FROM notifications_backup_full;

  RAISE NOTICE '✅ 전체 백업 완료:';
  RAISE NOTICE '  - 예약: % 건', booking_count;
  RAISE NOTICE '  - 결제: % 건', payment_count;
  RAISE NOTICE '  - 리뷰: % 건', review_count;
  RAISE NOTICE '  - 트레이너 응답: % 건', response_count;
  RAISE NOTICE '  - 알림: % 건', notification_count;
END $$;

-- ============================================
-- STEP 2: 데이터 삭제 (순서 중요!)
-- ============================================

-- 2.1 트레이너 응답 로그 삭제 (외래 키 참조 먼저)
DELETE FROM trainer_match_responses;

-- 2.2 알림 삭제
DELETE FROM notifications;

-- 2.3 리뷰 삭제
DELETE FROM reviews;

-- 2.4 결제 정보 삭제
DELETE FROM payments;

-- 2.5 예약 삭제
DELETE FROM bookings;

-- 삭제 결과 확인
DO $$
DECLARE
  remaining_bookings INTEGER;
  remaining_payments INTEGER;
  remaining_reviews INTEGER;
  remaining_responses INTEGER;
  remaining_notifications INTEGER;
  remaining_profiles INTEGER;
  remaining_customers INTEGER;
  remaining_trainers INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_bookings FROM bookings;
  SELECT COUNT(*) INTO remaining_payments FROM payments;
  SELECT COUNT(*) INTO remaining_reviews FROM reviews;
  SELECT COUNT(*) INTO remaining_responses FROM trainer_match_responses;
  SELECT COUNT(*) INTO remaining_notifications FROM notifications;
  SELECT COUNT(*) INTO remaining_profiles FROM profiles;
  SELECT COUNT(*) INTO remaining_customers FROM customers;
  SELECT COUNT(*) INTO remaining_trainers FROM trainers;

  RAISE NOTICE '✅ 삭제 완료:';
  RAISE NOTICE '  - 예약: % 건', remaining_bookings;
  RAISE NOTICE '  - 결제: % 건', remaining_payments;
  RAISE NOTICE '  - 리뷰: % 건', remaining_reviews;
  RAISE NOTICE '  - 트레이너 응답: % 건', remaining_responses;
  RAISE NOTICE '  - 알림: % 건', remaining_notifications;
  RAISE NOTICE '';
  RAISE NOTICE '✅ 유지된 데이터:';
  RAISE NOTICE '  - 프로필: % 개', remaining_profiles;
  RAISE NOTICE '  - 고객: % 명', remaining_customers;
  RAISE NOTICE '  - 트레이너: % 명', remaining_trainers;
END $$;

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 테스트 데이터 정리 완료!';
  RAISE NOTICE '';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '1. /booking/recommended 페이지에서 새 예약 생성';
  RAISE NOTICE '2. 결제 완료';
  RAISE NOTICE '3. /admin/bookings/auto-matching 에서 자동 매칭 확인';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ 롤백이 필요하면: 20251010180000_rollback.sql 실행';
END $$;
