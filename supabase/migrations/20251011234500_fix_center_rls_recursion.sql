-- Drop all center policies first
DROP POLICY IF EXISTS "Trainers can view own centers" ON centers;
DROP POLICY IF EXISTS "Trainers can insert own centers" ON centers;
DROP POLICY IF EXISTS "Trainers can update own unverified centers" ON centers;
DROP POLICY IF EXISTS "Trainers can delete own unverified centers" ON centers;
DROP POLICY IF EXISTS "Admins can insert centers" ON centers;
DROP POLICY IF EXISTS "Admins can update centers" ON centers;
DROP POLICY IF EXISTS "Admins can delete centers" ON centers;

-- Drop old function
DROP FUNCTION IF EXISTS is_trainer_owner(UUID);

-- Create a SECURITY DEFINER function that bypasses ALL RLS
CREATE OR REPLACE FUNCTION get_current_trainer_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- Use simple SQL to completely bypass RLS
  -- This function runs with definer's privileges (superuser)
  SELECT id
  FROM public.trainers
  WHERE profile_id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_current_trainer_id() TO authenticated;

-- Recreate policies using the new function

-- Trainers can view their own centers
CREATE POLICY "Trainers can view own centers"
  ON centers FOR SELECT
  USING (
    owner_id = get_current_trainer_id()
  );

-- Trainers can insert their own centers
CREATE POLICY "Trainers can insert own centers"
  ON centers FOR INSERT
  WITH CHECK (
    owner_id = get_current_trainer_id()
  );

-- Trainers can update their own unverified centers
CREATE POLICY "Trainers can update own unverified centers"
  ON centers FOR UPDATE
  USING (
    owner_id = get_current_trainer_id()
    AND is_verified = false
  );

-- Trainers can delete their own unverified centers
CREATE POLICY "Trainers can delete own unverified centers"
  ON centers FOR DELETE
  USING (
    owner_id = get_current_trainer_id()
    AND is_verified = false
  );

-- Admins can do everything
CREATE POLICY "Admins can insert centers"
  ON centers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update centers"
  ON centers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can delete centers"
  ON centers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );
