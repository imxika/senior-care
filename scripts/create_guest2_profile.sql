-- guest2@test.com의 profile 생성

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- 1. guest2@test.com의 auth.users ID 찾기 (Supabase Dashboard에서 확인 필요)
-- 여기서는 일단 profile 생성 준비

-- 2. 혹시 이미 있는지 다시 확인
SELECT 'Before creation' as status, COUNT(*) FROM profiles WHERE email = 'guest2@test.com';

-- 3. guest2@test.com profile 생성
-- ⚠️ 주의: guest2@test.com의 실제 auth.users UUID를 Supabase Dashboard에서 확인해서 넣어야 합니다
-- INSERT INTO profiles (id, email, full_name, user_type)
-- VALUES ('여기에-실제-UUID', 'guest2@test.com', 'Guest 2', 'customer');

-- 4. 생성 후 확인
-- SELECT 'After creation' as status, id, email, user_type FROM profiles WHERE email = 'guest2@test.com';

-- 5. customer 레코드 생성
-- INSERT INTO customers (profile_id)
-- SELECT id FROM profiles WHERE email = 'guest2@test.com'
-- ON CONFLICT (profile_id) DO NOTHING;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 실제 UUID를 알려주시면 위 주석을 풀고 실행하겠습니다.
SELECT '⚠️ guest2@test.com의 auth.users UUID가 필요합니다' as message;
SELECT 'Supabase Dashboard → Authentication → Users에서 guest2@test.com 찾아서 UUID 복사' as instruction;
