-- 모든 테이블의 RLS 정책 완전히 초기화

-- 1. RLS 비활성화
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE trainers DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses DISABLE ROW LEVEL SECURITY;

-- 2. profiles 테이블의 모든 정책 삭제
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can view trainer profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view customer profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view trainer and customer profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- 3. customers 테이블의 모든 정책 삭제
DROP POLICY IF EXISTS "customers_select_own" ON customers;
DROP POLICY IF EXISTS "customers_insert_own" ON customers;
DROP POLICY IF EXISTS "customers_update_own" ON customers;
DROP POLICY IF EXISTS "customers_delete_own" ON customers;
DROP POLICY IF EXISTS "admins_all_customers" ON customers;
DROP POLICY IF EXISTS "customers_all_admin" ON customers;
DROP POLICY IF EXISTS "trainers_select_customers_with_bookings" ON customers;

-- 4. trainers 테이블의 모든 정책 삭제
DROP POLICY IF EXISTS "trainers_select_own" ON trainers;
DROP POLICY IF EXISTS "trainers_insert_own" ON trainers;
DROP POLICY IF EXISTS "trainers_update_own" ON trainers;
DROP POLICY IF EXISTS "trainers_select_verified" ON trainers;
DROP POLICY IF EXISTS "trainers_all_admin" ON trainers;

-- 5. bookings 테이블의 모든 정책 삭제
DROP POLICY IF EXISTS "bookings_select_customer" ON bookings;
DROP POLICY IF EXISTS "bookings_select_trainer" ON bookings;
DROP POLICY IF EXISTS "bookings_select_admin" ON bookings;
DROP POLICY IF EXISTS "bookings_insert_customer" ON bookings;
DROP POLICY IF EXISTS "bookings_update_customer" ON bookings;
DROP POLICY IF EXISTS "bookings_update_trainer" ON bookings;
DROP POLICY IF EXISTS "bookings_update_admin" ON bookings;
DROP POLICY IF EXISTS "bookings_delete_admin" ON bookings;

-- 6. notifications 테이블의 모든 정책 삭제
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_system" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;

-- 7. reviews 테이블의 모든 정책 삭제
DROP POLICY IF EXISTS "reviews_select_all" ON reviews;
DROP POLICY IF EXISTS "reviews_insert_customer" ON reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
DROP POLICY IF EXISTS "reviews_update_customer" ON reviews;
DROP POLICY IF EXISTS "reviews_update_trainer_response" ON reviews;

-- 8. customer_addresses 테이블의 모든 정책 삭제
DROP POLICY IF EXISTS "addresses_all_own" ON customer_addresses;

-- 9. 확인
SELECT
  tablename,
  COUNT(*) as remaining_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'customers', 'trainers', 'bookings', 'notifications', 'reviews', 'customer_addresses')
GROUP BY tablename
ORDER BY tablename;

-- 10. 결과 메시지
DO $$
BEGIN
  RAISE NOTICE '=== All RLS policies dropped ===';
  RAISE NOTICE 'RLS is currently DISABLED on all tables';
  RAISE NOTICE 'Next step: Run proper RLS migration';
END $$;
