-- trainer5@test.com의 예약 확인

-- 1. trainer5의 profile_id 찾기
SELECT
  id as profile_id,
  email,
  full_name,
  user_type
FROM profiles
WHERE email = 'trainer5@test.com';

-- 2. trainer5의 trainer_id 찾기
SELECT
  t.id as trainer_id,
  t.profile_id,
  p.email,
  p.full_name
FROM trainers t
JOIN profiles p ON p.id = t.profile_id
WHERE p.email = 'trainer5@test.com';

-- 3. trainer5의 모든 예약 확인 (고객 정보 포함)
SELECT
  b.id,
  b.booking_date,
  b.start_time,
  b.status,
  b.booking_type,
  b.created_at,
  c.id as customer_id,
  cp.full_name as customer_name,
  cp.email as customer_email
FROM bookings b
LEFT JOIN customers c ON c.id = b.customer_id
LEFT JOIN profiles cp ON cp.id = c.profile_id
WHERE b.trainer_id IN (
  SELECT t.id
  FROM trainers t
  JOIN profiles p ON p.id = t.profile_id
  WHERE p.email = 'trainer5@test.com'
)
ORDER BY b.booking_date DESC, b.start_time DESC;

-- 4. 상태별 카운트
SELECT
  b.status,
  COUNT(*) as count
FROM bookings b
WHERE b.trainer_id IN (
  SELECT t.id
  FROM trainers t
  JOIN profiles p ON p.id = t.profile_id
  WHERE p.email = 'trainer5@test.com'
)
GROUP BY b.status
ORDER BY count DESC;

-- 5. 예약 타입별 카운트
SELECT
  b.booking_type,
  COUNT(*) as count
FROM bookings b
WHERE b.trainer_id IN (
  SELECT t.id
  FROM trainers t
  JOIN profiles p ON p.id = t.profile_id
  WHERE p.email = 'trainer5@test.com'
)
GROUP BY b.booking_type
ORDER BY count DESC;
