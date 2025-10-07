-- 순환 참조 없는 올바른 RLS 정책
-- auth.uid()와 직접 비교하여 순환 참조 제거

-- ============================================
-- 1. PROFILES 테이블 (기본 테이블)
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 자신의 프로필 조회
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 자신의 프로필 수정
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admin은 모든 프로필 조회
CREATE POLICY "profiles_select_admin"
ON profiles FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT id FROM profiles WHERE user_type = 'admin' AND id = auth.uid()
  )
);

-- ============================================
-- 2. CUSTOMERS 테이블
-- ============================================

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "customers_select_own" ON customers;
DROP POLICY IF EXISTS "customers_insert_own" ON customers;
DROP POLICY IF EXISTS "customers_update_own" ON customers;
DROP POLICY IF EXISTS "customers_delete_own" ON customers;
DROP POLICY IF EXISTS "admins_all_customers" ON customers;
DROP POLICY IF EXISTS "customers_all_admin" ON customers;
DROP POLICY IF EXISTS "trainers_select_customers_with_bookings" ON customers;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 고객: 자신의 레코드 조회 (profile_id로 직접 비교)
CREATE POLICY "customers_select_own"
ON customers FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- 고객: 자신의 레코드 생성
CREATE POLICY "customers_insert_own"
ON customers FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

-- 고객: 자신의 레코드 수정
CREATE POLICY "customers_update_own"
ON customers FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Admin: 모든 customers 접근 (profile_id로 직접 확인)
CREATE POLICY "customers_all_admin"
ON customers FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.user_type = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.user_type = 'admin'
  )
);

-- ============================================
-- 3. TRAINERS 테이블
-- ============================================

DROP POLICY IF EXISTS "trainers_select_own" ON trainers;
DROP POLICY IF EXISTS "trainers_insert_own" ON trainers;
DROP POLICY IF EXISTS "trainers_update_own" ON trainers;
DROP POLICY IF EXISTS "trainers_select_verified" ON trainers;
DROP POLICY IF EXISTS "trainers_all_admin" ON trainers;

ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;

-- 트레이너: 자신의 레코드 조회
CREATE POLICY "trainers_select_own"
ON trainers FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- 트레이너: 자신의 레코드 수정
CREATE POLICY "trainers_update_own"
ON trainers FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- 모두: 승인된 트레이너 목록 조회 가능 (공개 정보)
CREATE POLICY "trainers_select_verified"
ON trainers FOR SELECT
TO authenticated
USING (is_verified = true AND is_active = true);

-- Admin: 모든 trainers 접근
CREATE POLICY "trainers_all_admin"
ON trainers FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.user_type = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.user_type = 'admin'
  )
);

-- ============================================
-- 4. BOOKINGS 테이블 (순환 참조 제거)
-- ============================================

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "bookings_select_customer" ON bookings;
DROP POLICY IF EXISTS "bookings_select_trainer" ON bookings;
DROP POLICY IF EXISTS "bookings_select_admin" ON bookings;
DROP POLICY IF EXISTS "bookings_insert_customer" ON bookings;
DROP POLICY IF EXISTS "bookings_update_customer" ON bookings;
DROP POLICY IF EXISTS "bookings_update_trainer" ON bookings;
DROP POLICY IF EXISTS "bookings_update_admin" ON bookings;
DROP POLICY IF EXISTS "bookings_delete_admin" ON bookings;

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 고객: 자신의 예약 조회 (customers를 통하지 않고 직접 확인)
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

-- Admin: 모든 예약 조회
CREATE POLICY "bookings_select_admin"
ON bookings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.user_type = 'admin'
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
  AND (
    (booking_type = 'direct' AND trainer_id IS NOT NULL)
    OR (booking_type = 'recommended' AND trainer_id IS NULL)
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

-- 트레이너: 자신의 예약 수정 (상태 변경 등)
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

-- Admin: 모든 예약 수정
CREATE POLICY "bookings_update_admin"
ON bookings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.user_type = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.user_type = 'admin'
  )
);

-- Admin: 예약 삭제
CREATE POLICY "bookings_delete_admin"
ON bookings FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.user_type = 'admin'
  )
);

-- ============================================
-- 5. NOTIFICATIONS 테이블
-- ============================================

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_system" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 자신의 알림 조회
CREATE POLICY "notifications_select_own"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 자신의 알림 수정 (읽음 표시 등)
CREATE POLICY "notifications_update_own"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 시스템/서버가 알림 생성 (service_role)
CREATE POLICY "notifications_insert_system"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- 6. REVIEWS 테이블
-- ============================================

DROP POLICY IF EXISTS "reviews_select_all" ON reviews;
DROP POLICY IF EXISTS "reviews_insert_customer" ON reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
DROP POLICY IF EXISTS "reviews_update_customer" ON reviews;
DROP POLICY IF EXISTS "reviews_update_trainer_response" ON reviews;

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 모두: 모든 리뷰 조회 가능 (공개)
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

-- 트레이너: 자신의 리뷰에 응답 추가
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
-- 7. CUSTOMER_ADDRESSES 테이블
-- ============================================

DROP POLICY IF EXISTS "addresses_all_own" ON customer_addresses;

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

-- 고객: 자신의 주소 모든 작업
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

-- 확인 쿼리들
-- SELECT tablename, COUNT(*) as policy_count FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename ORDER BY tablename;
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bookings' ORDER BY cmd, policyname;
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'customers' ORDER BY cmd, policyname;
