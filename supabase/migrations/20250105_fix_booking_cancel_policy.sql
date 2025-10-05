-- Fix booking cancellation RLS policy
-- Issue: Customers can only update 'pending' bookings, but need to cancel 'confirmed' bookings too

-- Drop old restrictive policy
DROP POLICY IF EXISTS "Customers can update own pending bookings" ON bookings;

-- Create new policy allowing customers to update their own bookings
-- (status check moved to application logic)
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
