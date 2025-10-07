-- 완료된 예약에 service_completed_at 채우기
UPDATE bookings
SET service_completed_at = COALESCE(
  service_completed_at,
  booking_date + end_time::time
)
WHERE status = 'completed'
AND service_completed_at IS NULL;

-- 모든 완료된 예약 확인
SELECT
  id,
  status,
  booking_date,
  start_time,
  end_time,
  service_completed_at,
  created_at
FROM bookings
WHERE status = 'completed'
ORDER BY booking_date DESC;
