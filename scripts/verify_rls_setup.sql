-- RLS 정책이 제대로 적용되었는지 확인

-- 1. profiles 테이블 정책 확인
SELECT
  '=== PROFILES 정책 ===' as info,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- 2. guest2@test.com 계정 상태 확인 (RLS 끄고)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

SELECT
  'guest2 profile' as check_type,
  p.id,
  p.email,
  p.user_type,
  c.id as customer_id
FROM profiles p
LEFT JOIN customers c ON c.profile_id = p.id
WHERE p.email = 'guest2@test.com';

-- 3. RLS 다시 켜기
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 4. 전체 통계
SELECT
  user_type,
  COUNT(*) as count
FROM profiles
GROUP BY user_type;
