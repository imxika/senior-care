-- stest 계정 존재 여부 확인

-- 1. profiles 테이블에서 확인
SELECT id, email, user_type, created_at
FROM profiles
WHERE email IN ('stest@test.com', 'stest1@test.com');

-- 2. auth.users 테이블에서 확인 (service role 필요)
-- Supabase Dashboard > Authentication > Users에서 확인하거나
-- 아래 쿼리는 service role이 있어야 실행 가능:
-- SELECT id, email, created_at, deleted_at
-- FROM auth.users
-- WHERE email IN ('stest@test.com', 'stest1@test.com');
