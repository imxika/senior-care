-- 올바른 RLS 정책 (순환 참조 없음)
-- 테스트 완료 후 적용

-- ============================================
-- 1. PROFILES 테이블
-- ============================================

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_all_if_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_by_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_trainers" ON profiles;
DROP POLICY IF EXISTS "profiles_select_trainers_public" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1) 자신의 프로필은 무조건 조회 가능
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 2) 트레이너 프로필은 공개 (모두 조회 가능)
CREATE POLICY "profiles_select_trainers"
ON profiles FOR SELECT
TO authenticated
USING (user_type = 'trainer');

-- 3) 고객 프로필은 트레이너가 예약이 있으면 조회 가능
CREATE POLICY "profiles_select_customers_with_booking"
ON profiles FOR SELECT
TO authenticated
USING (
  user_type = 'customer'
  AND EXISTS (
    SELECT 1 FROM bookings b
    INNER JOIN customers c ON c.id = b.customer_id
    INNER JOIN trainers t ON t.id = b.trainer_id
    WHERE c.profile_id = profiles.id
    AND t.profile_id = auth.uid()
  )
);

-- 4) 자신의 프로필 수정
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================
-- 2. CUSTOMERS 테이블
-- ============================================

DROP POLICY IF EXISTS "customers_select_own" ON customers;
DROP POLICY IF EXISTS "customers_insert_own" ON customers;
DROP POLICY IF EXISTS "customers_update_own" ON customers;
DROP POLICY IF EXISTS "customers_delete_own" ON customers;
DROP POLICY IF EXISTS "customers_all_admin" ON customers;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 자신의 customer 레코드
CREATE POLICY "customers_select_own"
ON customers FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

CREATE POLICY "customers_insert_own"
ON customers FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "customers_update_own"
ON customers FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- ============================================
-- 3. TRAINERS 테이블
-- ============================================

DROP POLICY IF EXISTS "trainers_select_own" ON trainers;
DROP POLICY IF EXISTS "trainers_insert_own" ON trainers;
DROP POLICY IF EXISTS "trainers_update_own" ON trainers;
DROP POLICY IF EXISTS "trainers_select_verified" ON trainers;
DROP POLICY IF EXISTS "trainers_all_admin" ON trainers;

ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;

-- 자신의 trainer 레코드
CREATE POLICY "trainers_select_own"
ON trainers FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

CREATE POLICY "trainers_update_own"
ON trainers FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- 승인된 트레이너는 모두 조회 가능 (공개)
CREATE POLICY "trainers_select_verified"
ON trainers FOR SELECT
TO authenticated
USING (is_verified = true AND is_active = true);

-- ============================================
-- 4. BOOKINGS 테이블
-- ============================================

DROP POLICY IF EXISTS "bookings_select_customer" ON bookings;
DROP POLICY IF EXISTS "bookings_select_trainer" ON bookings;
DROP POLICY IF EXISTS "bookings_select_admin" ON bookings;
DROP POLICY IF EXISTS "bookings_insert_customer" ON bookings;
DROP POLICY IF EXISTS "bookings_update_customer" ON bookings;
DROP POLICY IF EXISTS "bookings_update_trainer" ON bookings;
DROP POLICY IF EXISTS "bookings_update_admin" ON bookings;
DROP POLICY IF EXISTS "bookings_delete_admin" ON bookings;

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 고객: 자신의 예약 조회
CREATE POLICY "bookings_select_customer"
ON bookings FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT c.id FROM customers c WHERE c.profile_id = auth.uid()
  )
);

-- 트레이너: 자신의 예약 조회
CREATE POLICY "bookings_select_trainer"
ON bookings FOR SELECT
TO authenticated
USING (
  trainer_id IN (
    SELECT t.id FROM trainers t WHERE t.profile_id = auth.uid()
  )
  OR (
    booking_type = 'recommended'
    AND trainer_id IS NULL
    AND status = 'pending'
    AND EXISTS (SELECT 1 FROM trainers t WHERE t.profile_id = auth.uid())
  )
);

-- 고객: 예약 생성
CREATE POLICY "bookings_insert_customer"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (
  customer_id IN (
    SELECT c.id FROM customers c WHERE c.profile_id = auth.uid()
  )
);

-- 고객: 자신의 예약 수정 (취소 등)
CREATE POLICY "bookings_update_customer"
ON bookings FOR UPDATE
TO authenticated
USING (
  customer_id IN (
    SELECT c.id FROM customers c WHERE c.profile_id = auth.uid()
  )
)
WITH CHECK (
  customer_id IN (
    SELECT c.id FROM customers c WHERE c.profile_id = auth.uid()
  )
);

-- 트레이너: 자신의 예약 수정
CREATE POLICY "bookings_update_trainer"
ON bookings FOR UPDATE
TO authenticated
USING (
  trainer_id IN (
    SELECT t.id FROM trainers t WHERE t.profile_id = auth.uid()
  )
)
WITH CHECK (
  trainer_id IN (
    SELECT t.id FROM trainers t WHERE t.profile_id = auth.uid()
  )
);

-- ============================================
-- 5. REVIEWS 테이블
-- ============================================

DROP POLICY IF EXISTS "reviews_select_all" ON reviews;
DROP POLICY IF EXISTS "reviews_insert_customer" ON reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
DROP POLICY IF EXISTS "reviews_update_customer" ON reviews;
DROP POLICY IF EXISTS "reviews_update_trainer_response" ON reviews;

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 모든 리뷰는 공개
CREATE POLICY "reviews_select_all"
ON reviews FOR SELECT
TO authenticated
USING (true);

-- 고객: 자신의 예약에 대한 리뷰 작성
CREATE POLICY "reviews_insert_customer"
ON reviews FOR INSERT
TO authenticated
WITH CHECK (
  booking_id IN (
    SELECT b.id FROM bookings b
    INNER JOIN customers c ON c.id = b.customer_id
    WHERE c.profile_id = auth.uid()
  )
);

-- 고객: 자신의 리뷰 수정
CREATE POLICY "reviews_update_customer"
ON reviews FOR UPDATE
TO authenticated
USING (
  booking_id IN (
    SELECT b.id FROM bookings b
    INNER JOIN customers c ON c.id = b.customer_id
    WHERE c.profile_id = auth.uid()
  )
)
WITH CHECK (
  booking_id IN (
    SELECT b.id FROM bookings b
    INNER JOIN customers c ON c.id = b.customer_id
    WHERE c.profile_id = auth.uid()
  )
);

-- 트레이너: 자신의 리뷰에 응답
CREATE POLICY "reviews_update_trainer_response"
ON reviews FOR UPDATE
TO authenticated
USING (
  trainer_id IN (
    SELECT t.id FROM trainers t WHERE t.profile_id = auth.uid()
  )
)
WITH CHECK (
  trainer_id IN (
    SELECT t.id FROM trainers t WHERE t.profile_id = auth.uid()
  )
);

-- ============================================
-- 6. CUSTOMER_ADDRESSES 테이블
-- ============================================

DROP POLICY IF EXISTS "addresses_all_own" ON customer_addresses;

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addresses_all_own"
ON customer_addresses FOR ALL
TO authenticated
USING (
  customer_id IN (
    SELECT c.id FROM customers c WHERE c.profile_id = auth.uid()
  )
)
WITH CHECK (
  customer_id IN (
    SELECT c.id FROM customers c WHERE c.profile_id = auth.uid()
  )
);

-- ============================================
-- 7. NOTIFICATIONS 테이블
-- ============================================

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_system" ON notifications;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_insert_system"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);
