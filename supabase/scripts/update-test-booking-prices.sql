-- 안전하게 테스트 예약 금액 업데이트
-- guest2@test.com (customer_id: 9fd2482f-30a7-475c-8094-4ce2a37a45fa)
-- 결제/정산 이력이 없는 28개 예약만 업데이트

-- 방법 1: 모두 100,000원으로 설정 (가장 간단)
UPDATE bookings
SET total_price = 100000
WHERE customer_id = '9fd2482f-30a7-475c-8094-4ce2a37a45fa'
  AND (total_price = 0 OR total_price IS NULL)
  AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = bookings.id)
  AND NOT EXISTS (SELECT 1 FROM settlements s WHERE s.booking_id = bookings.id);

-- 방법 2: 상태별로 다른 금액 설정 (더 현실적)
-- pending: 80,000 ~ 120,000원
UPDATE bookings
SET total_price = (80000 + (RANDOM() * 40000)::int)
WHERE customer_id = '9fd2482f-30a7-475c-8094-4ce2a37a45fa'
  AND status = 'pending'
  AND (total_price = 0 OR total_price IS NULL)
  AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = bookings.id)
  AND NOT EXISTS (SELECT 1 FROM settlements s WHERE s.booking_id = bookings.id);

-- confirmed: 90,000 ~ 150,000원
UPDATE bookings
SET total_price = (90000 + (RANDOM() * 60000)::int)
WHERE customer_id = '9fd2482f-30a7-475c-8094-4ce2a37a45fa'
  AND status = 'confirmed'
  AND (total_price = 0 OR total_price IS NULL)
  AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = bookings.id)
  AND NOT EXISTS (SELECT 1 FROM settlements s WHERE s.booking_id = bookings.id);

-- completed: 100,000 ~ 200,000원
UPDATE bookings
SET total_price = (100000 + (RANDOM() * 100000)::int)
WHERE customer_id = '9fd2482f-30a7-475c-8094-4ce2a37a45fa'
  AND status = 'completed'
  AND (total_price = 0 OR total_price IS NULL)
  AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = bookings.id)
  AND NOT EXISTS (SELECT 1 FROM settlements s WHERE s.booking_id = bookings.id);

-- 기타 상태: 100,000원
UPDATE bookings
SET total_price = 100000
WHERE customer_id = '9fd2482f-30a7-475c-8094-4ce2a37a45fa'
  AND status NOT IN ('pending', 'confirmed', 'completed')
  AND (total_price = 0 OR total_price IS NULL)
  AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = bookings.id)
  AND NOT EXISTS (SELECT 1 FROM settlements s WHERE s.booking_id = bookings.id);

-- 업데이트 결과 확인
SELECT
  status,
  COUNT(*) as count,
  MIN(total_price) as min_price,
  MAX(total_price) as max_price,
  ROUND(AVG(total_price)) as avg_price
FROM bookings
WHERE customer_id = '9fd2482f-30a7-475c-8094-4ce2a37a45fa'
GROUP BY status
ORDER BY status;
