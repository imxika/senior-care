-- 최근 예약의 날짜 확인 (16일 예약 찾기)

SELECT
  b.id,
  b.booking_date,
  b.start_time,
  b.status,
  b.created_at,
  cp.email as customer_email,
  tp.email as trainer_email
FROM bookings b
LEFT JOIN customers c ON c.id = b.customer_id
LEFT JOIN profiles cp ON cp.id = c.profile_id
LEFT JOIN trainers t ON t.id = b.trainer_id
LEFT JOIN profiles tp ON tp.id = t.profile_id
WHERE b.booking_date >= '2025-10-15'
  AND b.booking_date <= '2025-10-17'
ORDER BY b.created_at DESC
LIMIT 10;
