-- 프로필 데이터 확인

-- 1. guest2 프로필 확인
SELECT id, email, user_type, full_name, created_at
FROM profiles
WHERE email = 'guest2@test.com';

-- 2. admin 프로필 확인
SELECT id, email, user_type, full_name, created_at
FROM profiles
WHERE email = 'admin@test.com';

-- 3. 모든 프로필 수 확인
SELECT user_type, COUNT(*) as count
FROM profiles
GROUP BY user_type;

-- 4. RLS 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 5. RLS 활성화 상태 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';
