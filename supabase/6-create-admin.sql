-- Step 6: Create Admin Account
-- 관리자 계정 생성

-- 방법 1: 기존 계정을 admin으로 변경
-- UPDATE profiles SET user_type = 'admin' WHERE email = 'your-email@example.com';

-- 방법 2: 새로운 admin 프로필 직접 생성 (Auth 사용자는 이미 존재해야 함)
-- 먼저 Supabase Auth에서 admin@seniorcare.com 계정을 만든 후
-- 아래 명령으로 프로필을 admin으로 설정:

-- UPDATE profiles
-- SET user_type = 'admin'
-- WHERE id = (
--   SELECT id FROM auth.users WHERE email = 'admin@seniorcare.com'
-- );

-- 예시: 현재 로그인된 사용자를 admin으로 변경하려면
-- Supabase Dashboard에서 해당 사용자의 UUID를 복사한 후:
-- UPDATE profiles SET user_type = 'admin' WHERE id = 'YOUR-USER-UUID-HERE';
