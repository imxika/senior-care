-- auth.users에는 있지만 profiles에 없는 계정들을 위한 profile 생성

-- 1. 먼저 RLS 일시 해제 (생성 작업 위해)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE trainers DISABLE ROW LEVEL SECURITY;

-- 2. auth.users에는 있지만 profiles에 없는 사용자들 확인
-- (Supabase에서 auth.users는 직접 조회 못하므로, 로그로 확인)
DO $$
BEGIN
  RAISE NOTICE '=== Missing profiles check ===';
  RAISE NOTICE 'Total profiles: %', (SELECT COUNT(*) FROM profiles);
  RAISE NOTICE 'Profiles without user_type: %', (SELECT COUNT(*) FROM profiles WHERE user_type IS NULL);
END $$;

-- 3. guest2@test.com 계정 수동 생성
-- (실제 auth.users의 ID를 넣어야 함 - 아래는 예시)
-- 실제 ID는 Supabase Dashboard > Authentication > Users에서 확인

-- 예시: guest2@test.com의 실제 UUID를 찾아서 여기에 입력
-- INSERT INTO profiles (id, email, full_name, user_type)
-- VALUES ('실제-UUID-여기', 'guest2@test.com', 'Guest 2', 'customer')
-- ON CONFLICT (id) DO UPDATE
-- SET user_type = 'customer'
-- WHERE profiles.user_type IS NULL;

-- 4. user_type이 null인 기존 profiles를 customer로 업데이트
UPDATE profiles
SET user_type = 'customer'
WHERE user_type IS NULL;

-- 5. customer 레코드가 없는 customer 타입 profiles에 대해 생성
INSERT INTO customers (profile_id)
SELECT p.id FROM profiles p
WHERE p.user_type = 'customer'
  AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.profile_id = p.id)
ON CONFLICT (profile_id) DO NOTHING;

-- 6. trainer 레코드가 없는 trainer 타입 profiles에 대해 생성
INSERT INTO trainers (profile_id)
SELECT p.id FROM profiles p
WHERE p.user_type = 'trainer'
  AND NOT EXISTS (SELECT 1 FROM trainers t WHERE t.profile_id = p.id)
ON CONFLICT (profile_id) DO NOTHING;

-- 7. RLS 재활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;

-- 8. 결과 확인
SELECT
  p.user_type,
  COUNT(p.id) as profile_count,
  COUNT(c.id) as customer_count,
  COUNT(t.id) as trainer_count,
  COUNT(CASE WHEN c.id IS NULL AND t.id IS NULL THEN 1 END) as missing_records
FROM profiles p
LEFT JOIN customers c ON c.profile_id = p.id AND p.user_type = 'customer'
LEFT JOIN trainers t ON t.profile_id = p.id AND p.user_type = 'trainer'
GROUP BY p.user_type;

RAISE NOTICE '=== Profile creation complete ===';
