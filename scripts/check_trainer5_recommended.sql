-- trainer5의 추천 예약 상세 확인

-- trainer5의 trainer_id
WITH trainer5_id AS (
  SELECT t.id as trainer_id
  FROM trainers t
  JOIN profiles p ON p.id = t.profile_id
  WHERE p.email = 'trainer5@test.com'
)

-- 추천 예약 5건 상세 확인
SELECT
  b.id,
  b.booking_date,
  b.start_time,
  b.status,
  b.trainer_id,
  CASE
    WHEN b.trainer_id IS NULL THEN 'NULL (매칭 안됨)'
    WHEN b.trainer_id = (SELECT trainer_id FROM trainer5_id) THEN 'trainer5 (본인)'
    ELSE 'Other trainer (다른 트레이너)'
  END as trainer_status,
  cp.full_name as customer_name,
  cp.email as customer_email
FROM bookings b
LEFT JOIN customers c ON c.id = b.customer_id
LEFT JOIN profiles cp ON cp.id = c.profile_id
WHERE b.booking_type = 'recommended'
  AND (
    b.trainer_id = (SELECT trainer_id FROM trainer5_id)  -- trainer5의 예약
    OR (b.trainer_id IS NULL AND b.status = 'pending')   -- 매칭 안된 pending 예약
  )
ORDER BY b.booking_date DESC;
