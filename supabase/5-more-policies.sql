-- Step 5: More Policies (Bookings, Reviews, Payments, Notifications)
-- 추가 보안 정책

-- ====================================
-- Bookings Policies
-- ====================================

CREATE POLICY "Customers can view own bookings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      JOIN profiles p ON p.id = c.profile_id
      WHERE p.id = auth.uid()
      AND c.id = bookings.customer_id
    )
  );

CREATE POLICY "Trainers can view own bookings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trainers t
      JOIN profiles p ON p.id = t.profile_id
      WHERE p.id = auth.uid()
      AND t.id = bookings.trainer_id
    )
  );

CREATE POLICY "Customers can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c
      JOIN profiles p ON p.id = c.profile_id
      WHERE p.id = auth.uid()
      AND c.id = bookings.customer_id
    )
  );

CREATE POLICY "Customers can update own bookings"
  ON bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      JOIN profiles p ON p.id = c.profile_id
      WHERE p.id = auth.uid()
      AND c.id = bookings.customer_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c
      JOIN profiles p ON p.id = c.profile_id
      WHERE p.id = auth.uid()
      AND c.id = bookings.customer_id
    )
  );

CREATE POLICY "Trainers can update own bookings"
  ON bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trainers t
      JOIN profiles p ON p.id = t.profile_id
      WHERE p.id = auth.uid()
      AND t.id = bookings.trainer_id
    )
  );

-- ====================================
-- Reviews Policies
-- ====================================

CREATE POLICY "Public can view visible reviews"
  ON reviews FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Customers can view own reviews"
  ON reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      JOIN profiles p ON p.id = c.profile_id
      WHERE p.id = auth.uid()
      AND c.id = reviews.customer_id
    )
  );

CREATE POLICY "Customers can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      JOIN profiles p ON p.id = c.profile_id
      WHERE p.id = auth.uid()
      AND c.id = reviews.customer_id
      AND b.id = reviews.booking_id
      AND b.status = 'completed'
    )
  );

CREATE POLICY "Trainers can respond to reviews"
  ON reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trainers t
      JOIN profiles p ON p.id = t.profile_id
      WHERE p.id = auth.uid()
      AND t.id = reviews.trainer_id
    )
  );

-- ====================================
-- Payments Policies
-- ====================================

CREATE POLICY "Customers can view own payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      JOIN profiles p ON p.id = c.profile_id
      WHERE p.id = auth.uid()
      AND c.id = payments.customer_id
    )
  );

CREATE POLICY "Trainers can view booking payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN trainers t ON t.id = b.trainer_id
      JOIN profiles p ON p.id = t.profile_id
      WHERE p.id = auth.uid()
      AND b.id = payments.booking_id
    )
  );

-- ====================================
-- Notifications Policies
-- ====================================

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);
