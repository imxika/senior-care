-- Drop existing policies that might cause issues
DROP POLICY IF EXISTS "Customers can view own customer record" ON customers;
DROP POLICY IF EXISTS "Customers can update own customer record" ON customers;
DROP POLICY IF EXISTS "Customers can insert own customer record" ON customers;
DROP POLICY IF EXISTS "Admins can view all customer records" ON customers;
DROP POLICY IF EXISTS "Admins can update all customer records" ON customers;
DROP POLICY IF EXISTS "Trainers can view customer records with bookings" ON customers;

-- Re-enable RLS (in case it was disabled)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy: 고객은 자신의 customer 레코드를 볼 수 있음
CREATE POLICY "Customers can view own customer record"
ON customers
FOR SELECT
TO authenticated
USING (
  profile_id = auth.uid()
);

-- Policy: 고객은 자신의 customer 레코드를 업데이트할 수 있음 (USING과 WITH CHECK 모두 필요)
CREATE POLICY "Customers can update own customer record"
ON customers
FOR UPDATE
TO authenticated
USING (
  profile_id = auth.uid()
)
WITH CHECK (
  profile_id = auth.uid()
);

-- Policy: 고객은 자신의 customer 레코드를 생성할 수 있음
CREATE POLICY "Customers can insert own customer record"
ON customers
FOR INSERT
TO authenticated
WITH CHECK (
  profile_id = auth.uid()
);

-- Policy: Admin은 모든 customer 레코드를 볼 수 있음
CREATE POLICY "Admins can view all customer records"
ON customers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- Policy: Admin은 모든 customer 레코드를 업데이트할 수 있음
CREATE POLICY "Admins can update all customer records"
ON customers
FOR UPDATE
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

-- Policy: Admin은 모든 customer 레코드를 삭제할 수 있음
CREATE POLICY "Admins can delete customer records"
ON customers
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- Policy: Trainer는 예약이 있는 customer 정보를 볼 수 있음
CREATE POLICY "Trainers can view customer records with bookings"
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
