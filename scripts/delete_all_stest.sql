-- stest 관련 모든 계정 완전 삭제

-- 1. RLS 비활성화
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE trainers DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses DISABLE ROW LEVEL SECURITY;

-- 2. stest 계정 찾기
SELECT
  'stest accounts found' as info,
  id,
  email,
  user_type,
  created_at
FROM profiles
WHERE email ILIKE '%stest%'
ORDER BY created_at;

-- 3. stest 계정들의 관련 데이터 삭제
DO $$
DECLARE
  stest_profile RECORD;
  stest_customer_id bigint;
BEGIN
  FOR stest_profile IN
    SELECT id, email FROM profiles WHERE email ILIKE '%stest%'
  LOOP
    RAISE NOTICE 'Deleting data for: %', stest_profile.email;

    -- customer_id 찾기
    SELECT c.id INTO stest_customer_id
    FROM customers c
    WHERE c.profile_id = stest_profile.id;

    IF stest_customer_id IS NOT NULL THEN
      -- reviews 삭제
      DELETE FROM reviews WHERE customer_id = stest_customer_id;

      -- customer_addresses 삭제
      DELETE FROM customer_addresses WHERE customer_id = stest_customer_id;

      -- bookings 삭제
      DELETE FROM bookings WHERE customer_id = stest_customer_id;

      -- customers 삭제
      DELETE FROM customers WHERE id = stest_customer_id;
    END IF;

    -- notifications 삭제
    DELETE FROM notifications WHERE user_id = stest_profile.id;

    -- profile 삭제
    DELETE FROM profiles WHERE id = stest_profile.id;

    RAISE NOTICE 'Deleted profile: %', stest_profile.email;
  END LOOP;
END $$;

-- 4. 삭제 확인
SELECT
  'Remaining stest accounts' as info,
  COUNT(*) as count
FROM profiles
WHERE email ILIKE '%stest%';

-- 5. RLS 재활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

-- 6. auth.users에서도 삭제 필요 (수동)
SELECT '⚠️ auth.users에서도 삭제 필요' as warning;
SELECT 'Supabase Dashboard → Authentication → Users에서 stest 계정들 삭제' as instruction;
