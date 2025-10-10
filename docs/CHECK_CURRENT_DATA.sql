-- ============================================
-- 현재 데이터 상태 확인
-- ============================================
-- Supabase Dashboard SQL Editor에서 실행하세요

-- 1. 예약 현황
SELECT
  '예약 현황' as category,
  booking_type,
  status,
  matching_status,
  COUNT(*) as count
FROM bookings
GROUP BY booking_type, status, matching_status
ORDER BY booking_type, status;

-- 2. 결제 현황
SELECT
  '결제 현황' as category,
  payment_status,
  payment_method,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM payments
GROUP BY payment_status, payment_method
ORDER BY payment_status;

-- 3. 리뷰 현황
SELECT
  '리뷰 현황' as category,
  COUNT(*) as total_reviews
FROM reviews;

-- 4. 트레이너 응답 로그
SELECT
  '트레이너 응답' as category,
  response_type,
  COUNT(*) as count
FROM trainer_match_responses
GROUP BY response_type;

-- 5. 알림 현황
SELECT
  '알림 현황' as category,
  type,
  is_read,
  COUNT(*) as count
FROM notifications
GROUP BY type, is_read
ORDER BY type, is_read;

-- 6. 사용자 현황 (유지될 데이터)
SELECT
  '사용자' as category,
  user_type,
  COUNT(*) as count
FROM profiles
GROUP BY user_type;

-- 7. 상세 예약 목록 (최근 10건)
SELECT
  id,
  booking_type,
  status,
  matching_status,
  customer_id,
  trainer_id,
  total_price,
  created_at
FROM bookings
ORDER BY created_at DESC
LIMIT 10;

-- 8. 상세 결제 목록 (최근 10건)
SELECT
  id,
  booking_id,
  payment_status,
  amount,
  payment_method,
  created_at
FROM payments
ORDER BY created_at DESC
LIMIT 10;
