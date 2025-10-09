-- ============================================
-- 테스트 데이터 완전 초기화 스크립트
-- ============================================
-- 주의: 이 스크립트는 admin 계정을 제외한 모든 데이터를 삭제합니다
-- Supabase SQL Editor에서 실행하세요

-- 1. 리뷰 삭제 (가장 하위 테이블)
DELETE FROM reviews;
SELECT 'Reviews deleted' as status;

-- 2. 결제 삭제
DELETE FROM payments;
SELECT 'Payments deleted' as status;

-- 3. 예약 삭제
DELETE FROM bookings;
SELECT 'Bookings deleted' as status;

-- 4. 알림 삭제 (admin 알림 제외 옵션)
DELETE FROM notifications
WHERE user_id NOT IN (
  SELECT id FROM profiles WHERE user_type = 'admin'
);
SELECT 'Notifications deleted' as status;

-- 5. 트레이너 가용성 삭제
DELETE FROM trainer_availabilities;
SELECT 'Trainer availabilities deleted' as status;

-- 6. 고객 삭제
DELETE FROM customers;
SELECT 'Customers deleted' as status;

-- 7. 트레이너 삭제
DELETE FROM trainers;
SELECT 'Trainers deleted' as status;

-- 8. 프로필 삭제 (admin 제외)
DELETE FROM profiles
WHERE user_type IN ('customer', 'trainer');
SELECT 'Profiles deleted (admin preserved)' as status;

-- 9. Auth 사용자 삭제는 Supabase Dashboard에서 수동으로
-- Authentication > Users 에서 삭제해야 합니다

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
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'trainer_availabilities', COUNT(*) FROM trainer_availabilities
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'trainers', COUNT(*) FROM trainers
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
ORDER BY table_name;

SELECT '✅ Test data reset complete!' as result;
