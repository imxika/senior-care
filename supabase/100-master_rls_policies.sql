-- =============================================================================
-- 마스터 RLS 정책 파일
-- 이 파일 하나로 모든 RLS 정책을 관리합니다
-- =============================================================================

-- =============================================================================
-- STEP 1: 모든 기존 정책 완전 삭제
-- =============================================================================

-- profiles 테이블의 모든 정책 삭제
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON profiles';
    END LOOP;
END $$;

-- customers 테이블의 모든 정책 삭제
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'customers' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON customers';
    END LOOP;
END $$;

-- trainers 테이블의 모든 정책 삭제
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'trainers' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON trainers';
    END LOOP;
END $$;

-- bookings 테이블의 모든 정책 삭제
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bookings' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON bookings';
    END LOOP;
END $$;

-- reviews 테이블의 모든 정책 삭제
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'reviews' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON reviews';
    END LOOP;
END $$;

-- customer_addresses 테이블의 모든 정책 삭제
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'customer_addresses' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON customer_addresses';
    END LOOP;
END $$;

-- notifications 테이블의 모든 정책 삭제
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'notifications' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON notifications';
    END LOOP;
END $$;

-- =============================================================================
-- STEP 2: RLS 활성화
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 3: PROFILES 정책
-- =============================================================================

-- 규칙:
-- 1. 자신의 프로필은 무조건 볼 수 있음
-- 2. 트레이너 프로필은 공개 (누구나 볼 수 있음)
-- 3. 회원가입 시 자신의 프로필 생성 가능
-- 4. 자신의 프로필만 수정 가능
-- 5. Admin은 service role로 접근 (RLS 우회)

CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "profiles_select_trainers"
ON profiles FOR SELECT
TO authenticated
USING (user_type = 'trainer');

CREATE POLICY "profiles_insert_new_user"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- =============================================================================
-- STEP 4: CUSTOMERS 정책
-- =============================================================================

-- 규칙:
-- 1. 자신의 customer 레코드만 CRUD 가능

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

-- =============================================================================
-- STEP 5: TRAINERS 정책
-- =============================================================================

-- 규칙:
-- 1. 자신의 trainer 레코드는 조회/수정 가능
-- 2. 승인된 트레이너는 누구나 조회 가능 (공개)

CREATE POLICY "trainers_select_own"
ON trainers FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

CREATE POLICY "trainers_select_verified"
ON trainers FOR SELECT
TO authenticated
USING (is_verified = true AND is_active = true);

CREATE POLICY "trainers_update_own"
ON trainers FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- =============================================================================
-- STEP 6: BOOKINGS 정책
-- =============================================================================

-- 규칙:
-- 1. 고객은 자신의 예약만 조회/생성/수정 가능
-- 2. 트레이너는 자신이 배정된 예약 조회/수정 가능
-- 3. 트레이너는 추천 예약(pending) 조회 가능

CREATE POLICY "bookings_select_customer"
ON bookings FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT c.id FROM customers c WHERE c.profile_id = auth.uid()
  )
);

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

CREATE POLICY "bookings_insert_customer"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (
  customer_id IN (
    SELECT c.id FROM customers c WHERE c.profile_id = auth.uid()
  )
);

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

-- =============================================================================
-- STEP 7: REVIEWS 정책
-- =============================================================================

-- 규칙:
-- 1. 모든 리뷰는 공개 (누구나 조회 가능)
-- 2. 고객은 자신의 예약에 대한 리뷰 작성/수정 가능
-- 3. 트레이너는 자신의 리뷰에 응답 추가 가능

CREATE POLICY "reviews_select_all"
ON reviews FOR SELECT
TO authenticated
USING (true);

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

-- =============================================================================
-- STEP 8: CUSTOMER_ADDRESSES 정책
-- =============================================================================

-- 규칙:
-- 1. 고객은 자신의 주소만 CRUD 가능

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

-- =============================================================================
-- STEP 9: NOTIFICATIONS 정책
-- =============================================================================

-- 규칙:
-- 1. 자신의 알림만 조회/수정 가능
-- 2. 시스템은 누구에게나 알림 생성 가능 (서버에서)

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

-- =============================================================================
-- 검증 쿼리 (실행하지 않음, 참고용)
-- =============================================================================

-- 각 테이블별 정책 수 확인:
-- SELECT tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- GROUP BY tablename
-- ORDER BY tablename;

-- 특정 테이블의 정책 상세 확인:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'profiles' AND schemaname = 'public'
-- ORDER BY policyname;
