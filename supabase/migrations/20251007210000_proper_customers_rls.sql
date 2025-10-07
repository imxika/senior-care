-- 올바른 customers 테이블 RLS 정책
-- 보안을 유지하면서 모든 기능이 작동하도록 설정

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Customers can view own customer record" ON customers;
DROP POLICY IF EXISTS "Customers can update own customer record" ON customers;
DROP POLICY IF EXISTS "Customers can insert own customer record" ON customers;
DROP POLICY IF EXISTS "Admins can view all customer records" ON customers;
DROP POLICY IF EXISTS "Admins can update all customer records" ON customers;
DROP POLICY IF EXISTS "Admins can delete customer records" ON customers;
DROP POLICY IF EXISTS "Trainers can view customer records with bookings" ON customers;

-- RLS 활성화
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 1. SELECT 정책: 자신의 레코드 조회
CREATE POLICY "customers_select_own"
ON customers
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- 2. INSERT 정책: 자신의 레코드 생성 (트리거가 실패할 경우를 위해)
CREATE POLICY "customers_insert_own"
ON customers
FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

-- 3. UPDATE 정책: 자신의 레코드 수정
CREATE POLICY "customers_update_own"
ON customers
FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- 4. DELETE 정책: 자신의 레코드 삭제 (필요한 경우)
CREATE POLICY "customers_delete_own"
ON customers
FOR DELETE
TO authenticated
USING (profile_id = auth.uid());

-- Admin 정책들 (ALL 권한)
CREATE POLICY "admins_all_customers"
ON customers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- Trainer 정책: 예약이 있는 고객만 조회
CREATE POLICY "trainers_select_customers_with_bookings"
ON customers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trainers
    INNER JOIN bookings ON bookings.trainer_id = trainers.id
    WHERE trainers.profile_id = auth.uid()
    AND bookings.customer_id = customers.id
  )
);

-- 확인: 정책이 제대로 생성되었는지 확인
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'customers';
