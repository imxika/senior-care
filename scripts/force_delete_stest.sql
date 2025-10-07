-- stest@test.com 강제 삭제 (모든 관련 데이터 포함)

-- 1. 모든 RLS 비활성화
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE trainers DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses DISABLE ROW LEVEL SECURITY;

-- 2. stest@test.com의 profile_id 찾기
DO $$
DECLARE
  stest_profile_id uuid;
  stest_customer_id bigint;
BEGIN
  -- profile_id 찾기
  SELECT id INTO stest_profile_id
  FROM profiles
  WHERE email = 'stest@test.com';

  IF stest_profile_id IS NULL THEN
    RAISE NOTICE 'stest@test.com profile not found';
  ELSE
    RAISE NOTICE 'Found stest profile: %', stest_profile_id;

    -- customer_id 찾기
    SELECT id INTO stest_customer_id
    FROM customers
    WHERE profile_id = stest_profile_id;

    IF stest_customer_id IS NOT NULL THEN
      RAISE NOTICE 'Found stest customer: %', stest_customer_id;

      -- 3. 관련 데이터 삭제 (역순으로)
      DELETE FROM reviews WHERE customer_id = stest_customer_id;
      RAISE NOTICE 'Deleted reviews';

      DELETE FROM customer_addresses WHERE customer_id = stest_customer_id;
      RAISE NOTICE 'Deleted addresses';

      DELETE FROM bookings WHERE customer_id = stest_customer_id;
      RAISE NOTICE 'Deleted bookings';

      DELETE FROM customers WHERE id = stest_customer_id;
      RAISE NOTICE 'Deleted customer record';
    END IF;

    -- 4. 알림 삭제
    DELETE FROM notifications WHERE user_id = stest_profile_id;
    RAISE NOTICE 'Deleted notifications';

    -- 5. Profile 삭제
    DELETE FROM profiles WHERE id = stest_profile_id;
    RAISE NOTICE 'Deleted profile';

    -- 6. auth.users에서도 삭제 시도 (service_role 필요)
    -- Supabase Dashboard에서 수동으로 삭제해야 함
    RAISE NOTICE 'Profile deleted. Now delete auth.users manually from Supabase Dashboard';
  END IF;
END $$;

-- 7. RLS 재활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

-- 8. 확인
SELECT 'Remaining stest accounts' as check_type, COUNT(*) as count
FROM profiles
WHERE email = 'stest@test.com';
