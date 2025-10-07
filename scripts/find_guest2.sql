-- guest2@test.com 찾기

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- 1. 정확히 guest2@test.com
SELECT
  'Exact match' as search_type,
  id,
  email,
  user_type,
  created_at
FROM profiles
WHERE email = 'guest2@test.com';

-- 2. guest 포함하는 모든 계정
SELECT
  'Guest accounts' as search_type,
  id,
  email,
  user_type,
  created_at
FROM profiles
WHERE email ILIKE '%guest%'
ORDER BY created_at DESC;

-- 3. 최근 5개 계정
SELECT
  'Recent 5' as search_type,
  id,
  email,
  user_type,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
