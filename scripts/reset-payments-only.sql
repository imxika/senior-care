-- ============================================
-- 결제 정보만 초기화 스크립트
-- ============================================
-- 계정, 트레이너, 고객 정보는 유지하고
-- 예약, 결제, 리뷰만 삭제합니다
-- Supabase SQL Editor에서 실행하세요

-- 1. 리뷰 삭제 (예약과 연결)
DELETE FROM reviews;
SELECT 'Reviews deleted' as status;

-- 2. 결제 삭제
DELETE FROM payments;
SELECT 'Payments deleted' as status;

-- 3. 예약 삭제
DELETE FROM bookings;
SELECT 'Bookings deleted' as status;

-- 4. 예약 관련 알림만 삭제 (다른 알림은 유지)
DELETE FROM notifications
WHERE notification_type IN (
  'booking_created',
  'booking_confirmed',
  'booking_cancelled',
  'booking_reminder',
  'payment_received',
  'payment_failed',
  'payment_refunded'
);
SELECT 'Booking/Payment notifications deleted' as status;

-- 결과 확인
SELECT
  'reviews' as table_name,
  COUNT(*) as remaining_rows
FROM reviews
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'trainers', COUNT(*) FROM trainers
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
ORDER BY table_name;

SELECT '✅ Payment data reset complete! Accounts preserved.' as result;
