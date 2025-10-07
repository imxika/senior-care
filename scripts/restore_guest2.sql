-- guest2@test.com 복구 - bookings에서 정보 찾기

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- 1. guest2가 만든 예약이 있는지 확인 (customer_id를 통해)
SELECT
  'guest2의 예약' as info,
  b.id as booking_id,
  b.customer_id,
  b.status,
  b.created_at
FROM bookings b
ORDER BY b.created_at DESC
LIMIT 10;

-- 2. customers 테이블에서 고아 레코드 찾기 (profile이 없는 customer)
SELECT
  'Profile 없는 customers' as info,
  c.id as customer_id,
  c.profile_id,
  c.created_at
FROM customers c
LEFT JOIN profiles p ON p.id = c.profile_id
WHERE p.id IS NULL;

-- 3. 모든 customer 확인
SELECT
  'All customers with profiles' as info,
  c.id as customer_id,
  c.profile_id,
  p.email,
  p.user_type
FROM customers c
LEFT JOIN profiles p ON p.id = c.profile_id
ORDER BY c.created_at DESC;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
