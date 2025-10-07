-- Add trainer_response column to reviews table
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS trainer_response TEXT,
ADD COLUMN IF NOT EXISTS trainer_response_at TIMESTAMPTZ;

-- Drop existing policy if exists and recreate
DROP POLICY IF EXISTS "Trainers can respond to reviews" ON reviews;

-- Update RLS policy to allow trainers to update their responses
CREATE POLICY "Trainers can respond to reviews"
  ON reviews
  FOR UPDATE
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    trainer_id IN (
      SELECT id FROM trainers WHERE profile_id = auth.uid()
    )
  );
