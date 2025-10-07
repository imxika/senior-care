-- stest@test.com 사용자 완전 삭제
-- 관련된 모든 데이터를 cascade 삭제

-- 1. profile_id 확인
DO $$
DECLARE
  test_profile_id uuid := '936d9eaf-1c2e-4817-92a1-def909346115';
BEGIN
  -- 삭제 전 확인
  RAISE NOTICE '=== stest@test.com 사용자 데이터 확인 ===';

  RAISE NOTICE '프로필: %', (
    SELECT ROW(id, email, full_name, user_type)
    FROM profiles
    WHERE id = test_profile_id
  );

  RAISE NOTICE 'Customer 레코드: %', (
    SELECT id FROM customers WHERE profile_id = test_profile_id
  );

  RAISE NOTICE '예약 수: %', (
    SELECT COUNT(*) FROM bookings
    WHERE customer_id IN (SELECT id FROM customers WHERE profile_id = test_profile_id)
  );

  RAISE NOTICE '알림 수: %', (
    SELECT COUNT(*) FROM notifications WHERE user_id = test_profile_id
  );

  -- RLS 일시 해제 (삭제 작업 위해)
  ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
  ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
  ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
  ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
  ALTER TABLE customer_addresses DISABLE ROW LEVEL SECURITY;
  ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

  -- 삭제 시작
  RAISE NOTICE '=== 삭제 시작 ===';

  -- 2. 리뷰 삭제
  DELETE FROM reviews
  WHERE customer_id IN (SELECT id FROM customers WHERE profile_id = test_profile_id);
  RAISE NOTICE '리뷰 삭제 완료';

  -- 3. 예약 삭제
  DELETE FROM bookings
  WHERE customer_id IN (SELECT id FROM customers WHERE profile_id = test_profile_id);
  RAISE NOTICE '예약 삭제 완료';

  -- 4. 알림 삭제
  DELETE FROM notifications WHERE user_id = test_profile_id;
  RAISE NOTICE '알림 삭제 완료';

  -- 5. 주소 삭제
  DELETE FROM customer_addresses
  WHERE customer_id IN (SELECT id FROM customers WHERE profile_id = test_profile_id);
  RAISE NOTICE '주소 삭제 완료';

  -- 6. Customer 레코드 삭제
  DELETE FROM customers WHERE profile_id = test_profile_id;
  RAISE NOTICE 'Customer 레코드 삭제 완료';

  -- 7. Profile 삭제
  DELETE FROM profiles WHERE id = test_profile_id;
  RAISE NOTICE 'Profile 삭제 완료';

  -- RLS 재활성화
  ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
  ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
  ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

  RAISE NOTICE '=== 삭제 완료 ===';
  RAISE NOTICE '이제 stest@test.com으로 다시 회원가입하세요!';
END $$;
