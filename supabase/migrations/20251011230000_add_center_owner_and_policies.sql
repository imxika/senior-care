-- Add owner_id column to centers table
ALTER TABLE centers ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES trainers(id) ON DELETE SET NULL;

-- Create index for owner_id
CREATE INDEX IF NOT EXISTS idx_centers_owner_id ON centers(owner_id) WHERE owner_id IS NOT NULL;

-- Drop old policies
DROP POLICY IF EXISTS "Admins can insert centers" ON centers;
DROP POLICY IF EXISTS "Admins can update centers" ON centers;
DROP POLICY IF EXISTS "Admins can delete centers" ON centers;

-- Helper function to check if user is trainer owner (prevents RLS recursion)
CREATE OR REPLACE FUNCTION is_trainer_owner(trainer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trainers
    WHERE trainers.id = trainer_id
    AND trainers.profile_id = auth.uid()
  );
$$;

-- New policies for trainer-owned centers

-- Trainers can view their own centers (regardless of verification status)
CREATE POLICY "Trainers can view own centers"
  ON centers FOR SELECT
  USING (
    owner_id IS NOT NULL
    AND is_trainer_owner(owner_id)
  );

-- Trainers can insert their own centers (up to 3)
CREATE POLICY "Trainers can insert own centers"
  ON centers FOR INSERT
  WITH CHECK (
    owner_id IS NOT NULL
    AND is_trainer_owner(owner_id)
  );

-- Trainers can update their own unverified centers
CREATE POLICY "Trainers can update own unverified centers"
  ON centers FOR UPDATE
  USING (
    owner_id IS NOT NULL
    AND is_verified = false
    AND is_trainer_owner(owner_id)
  );

-- Trainers can delete their own unverified centers
CREATE POLICY "Trainers can delete own unverified centers"
  ON centers FOR DELETE
  USING (
    owner_id IS NOT NULL
    AND is_verified = false
    AND is_trainer_owner(owner_id)
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

-- Add comment
COMMENT ON COLUMN centers.owner_id IS '센터 소유자 (트레이너) - 트레이너가 직접 등록한 센터인 경우';
