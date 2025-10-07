-- guest2@test.com의 email 복구

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 1. 현재 상태 확인
SELECT
  'Before fix' as status,
  id,
  email,
  user_type
FROM profiles
WHERE id = '892c91bc-438d-4c94-882a-66093d0caad4';

-- 2. email 업데이트
UPDATE profiles
SET email = 'guest2@test.com'
WHERE id = '892c91bc-438d-4c94-882a-66093d0caad4';

-- 3. 수정 후 확인
SELECT
  'After fix' as status,
  id,
  email,
  user_type
FROM profiles
WHERE id = '892c91bc-438d-4c94-882a-66093d0caad4';

-- 4. customer 레코드 확인
SELECT
  'Customer record' as status,
  c.id as customer_id,
  c.profile_id,
  p.email
FROM customers c
LEFT JOIN profiles p ON p.id = c.profile_id
WHERE c.profile_id = '892c91bc-438d-4c94-882a-66093d0caad4';

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
