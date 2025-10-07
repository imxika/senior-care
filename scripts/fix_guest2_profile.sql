-- guest2@test.com의 user_type을 customer로 수정

-- 1. 먼저 현재 상태 확인
SELECT
  id,
  email,
  full_name,
  user_type,
  '수정 전' as status
FROM profiles
WHERE email = 'guest2@test.com';

-- 2. user_type이 null이면 customer로 수정
UPDATE profiles
SET user_type = 'customer'
WHERE email = 'guest2@test.com'
  AND (user_type IS NULL OR user_type = '');

-- 3. 수정 후 상태 확인
SELECT
  id,
  email,
  full_name,
  user_type,
  '수정 후' as status
FROM profiles
WHERE email = 'guest2@test.com';

-- 4. customer 레코드가 없으면 생성
INSERT INTO customers (profile_id)
SELECT id FROM profiles
WHERE email = 'guest2@test.com'
  AND id NOT IN (SELECT profile_id FROM customers WHERE profile_id IS NOT NULL)
ON CONFLICT (profile_id) DO NOTHING;

-- 5. 최종 확인
SELECT
  p.email,
  p.user_type,
  c.id as customer_id,
  '최종 상태' as status
FROM profiles p
LEFT JOIN customers c ON c.profile_id = p.id
WHERE p.email = 'guest2@test.com';
