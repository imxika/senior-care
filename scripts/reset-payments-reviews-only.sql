-- ============================================
-- 결제와 리뷰만 초기화 스크립트
-- ============================================
-- 계정, 트레이너, 고객, 예약 정보는 유지하고
-- 결제, 리뷰만 삭제합니다
-- Supabase SQL Editor에서 실행하세요

-- 1. 리뷰 삭제
DELETE FROM reviews;
SELECT 'Reviews deleted' as status;

-- 2. 결제 삭제
DELETE FROM payments;
SELECT 'Payments deleted' as status;

-- 3. 예약의 결제 상태는 유지하되, 결제 관련 알림만 삭제
DELETE FROM notifications
WHERE notification_type IN (
  'payment_received',
  'payment_failed',
  'payment_refunded'
);
SELECT 'Payment notifications deleted' as status;

-- 4. (선택사항) 예약 상태를 pending으로 되돌리기
-- UPDATE bookings SET status = 'pending' WHERE status = 'confirmed';
-- SELECT 'Bookings reset to pending' as status;

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

SELECT '✅ Payments and reviews reset! Bookings and accounts preserved.' as result;
