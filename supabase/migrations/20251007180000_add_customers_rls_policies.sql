-- Enable RLS on customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy: 고객은 자신의 customer 레코드를 볼 수 있음
CREATE POLICY "Customers can view own customer record"
ON customers
FOR SELECT
USING (
  auth.uid() = profile_id
);

-- Policy: 고객은 자신의 customer 레코드를 업데이트할 수 있음
CREATE POLICY "Customers can update own customer record"
ON customers
FOR UPDATE
USING (
  auth.uid() = profile_id
);

-- Policy: 고객은 자신의 customer 레코드를 생성할 수 있음 (트리거로 자동 생성되지만 만약을 위해)
CREATE POLICY "Customers can insert own customer record"
ON customers
FOR INSERT
WITH CHECK (
  auth.uid() = profile_id
);

-- Policy: Admin은 모든 customer 레코드를 볼 수 있음
CREATE POLICY "Admins can view all customer records"
ON customers
FOR SELECT
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
USING (
  EXISTS (
    SELECT 1 FROM trainers
    INNER JOIN bookings ON bookings.trainer_id = trainers.id
    WHERE trainers.profile_id = auth.uid()
    AND bookings.customer_id = customers.id
  )
);
