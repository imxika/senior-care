-- Step 10: Setup admin accounts
-- Admin 계정 설정

-- kswadv@gmail.com, kswadkr@gmail.com을 admin으로 설정
UPDATE profiles
SET user_type = 'admin'
WHERE email IN ('kswadv@gmail.com', 'kswadkr@gmail.com');

-- 없으면 생성 (auth.users에 있는 경우)
INSERT INTO profiles (id, user_type, full_name, email)
SELECT
  id,
  'admin',
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  email
FROM auth.users
WHERE email IN ('kswadv@gmail.com', 'kswadkr@gmail.com')
ON CONFLICT (id) DO UPDATE SET user_type = 'admin';

-- Admin용 RLS 정책 추가
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' IN ('kswadv@gmail.com', 'kswadkr@gmail.com')
);
