-- stest3@test.com의 최신 예약 확인

-- stest3의 최근 예약 (실시간 확인용)
SELECT
  b.id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.status,
  b.booking_type,
  b.created_at,
  cp.email as customer_email,
  tp.email as trainer_email
FROM bookings b
LEFT JOIN customers c ON c.id = b.customer_id
LEFT JOIN profiles cp ON cp.id = c.profile_id
LEFT JOIN trainers t ON t.id = b.trainer_id
LEFT JOIN profiles tp ON tp.id = t.profile_id
WHERE cp.email = 'stest3@test.com'
ORDER BY b.created_at DESC
LIMIT 5;

-- 가장 최근 예약 1건만 상세 확인
SELECT
  b.id as booking_id,
  b.booking_date as "예약 날짜 (DB에 저장된 값)",
  b.start_time as "시작 시간",
  b.end_time as "종료 시간",
  b.created_at as "예약 생성 시각",
  b.status,
  b.booking_type,
  cp.email as customer_email,
  cp.full_name as customer_name
FROM bookings b
LEFT JOIN customers c ON c.id = b.customer_id
LEFT JOIN profiles cp ON cp.id = c.profile_id
WHERE cp.email = 'stest3@test.com'
ORDER BY b.created_at DESC
LIMIT 1;
