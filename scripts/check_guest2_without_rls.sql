-- RLS 없이 guest2 계정 확인

-- 1. RLS 일시 해제
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- 2. guest2@test.com 찾기
SELECT
  'guest2 Profile' as check_type,
  id,
  email,
  full_name,
  user_type,
  created_at
FROM profiles
WHERE email = 'guest2@test.com';

-- 3. 이메일에 guest가 포함된 모든 계정 찾기
SELECT
  'All guest accounts' as check_type,
  id,
  email,
  full_name,
  user_type,
  created_at
FROM profiles
WHERE email ILIKE '%guest%'
ORDER BY created_at DESC;

-- 4. 최근 생성된 profiles 확인 (최근 5개)
SELECT
  'Recent profiles' as check_type,
  id,
  email,
  full_name,
  user_type,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- 5. Customer 레코드와 매칭
SELECT
  'Profiles with customers' as check_type,
  p.email,
  p.user_type,
  c.id as customer_id,
  p.created_at
FROM profiles p
LEFT JOIN customers c ON c.profile_id = p.id
WHERE p.email ILIKE '%guest%'
ORDER BY p.created_at DESC;

-- 6. RLS 재활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
