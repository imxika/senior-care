-- guest2@test.com 계정 빠른 수정

-- 1. RLS 일시 해제
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- 2. guest2의 auth user ID 찾기 및 profile 생성
-- (Supabase auth.users에서 guest2@test.com의 실제 UUID를 찾아서 입력)

-- 임시: 모든 user_type이 null인 profiles를 customer로 업데이트
UPDATE profiles
SET user_type = 'customer'
WHERE user_type IS NULL;

-- 3. customer 레코드 생성
INSERT INTO customers (profile_id)
SELECT p.id FROM profiles p
WHERE p.user_type = 'customer'
  AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.profile_id = p.id);

-- 4. RLS 재활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 5. 결과 확인
SELECT
  p.email,
  p.user_type,
  c.id as customer_id
FROM profiles p
LEFT JOIN customers c ON c.profile_id = p.id
WHERE p.email ILIKE '%guest%';
