-- guest2@test.com 계정 상태 확인

-- 1. Profile 존재 여부 및 user_type
SELECT
  'Profile 정보' as check_type,
  id,
  email,
  full_name,
  user_type,
  created_at
FROM profiles
WHERE email = 'guest2@test.com';

-- 2. Customer 레코드 존재 여부
SELECT
  'Customer 레코드' as check_type,
  c.id,
  c.profile_id,
  c.created_at
FROM customers c
INNER JOIN profiles p ON p.id = c.profile_id
WHERE p.email = 'guest2@test.com';

-- 3. 모든 profiles 확인 (user_type이 null인 것들)
SELECT
  'user_type이 null인 profiles' as check_type,
  id,
  email,
  full_name,
  user_type,
  created_at
FROM profiles
WHERE user_type IS NULL;

-- 4. guest2가 만든 예약이 있는지 확인
SELECT
  'guest2의 예약' as check_type,
  b.id,
  b.status,
  b.booking_type,
  b.created_at
FROM bookings b
INNER JOIN customers c ON c.id = b.customer_id
INNER JOIN profiles p ON p.id = c.profile_id
WHERE p.email = 'guest2@test.com';
