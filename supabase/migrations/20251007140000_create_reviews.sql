-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(booking_id) -- 예약당 하나의 리뷰만 가능
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_trainer ON reviews(trainer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 모든 사용자는 리뷰를 읽을 수 있음 (공개)
CREATE POLICY "Anyone can view reviews"
  ON reviews
  FOR SELECT
  USING (true);

-- 고객은 자신의 완료된 예약에 대해서만 리뷰 작성 가능
CREATE POLICY "Customers can create reviews for their completed bookings"
  ON reviews
  FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
    AND booking_id IN (
      SELECT b.id FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      WHERE c.profile_id = auth.uid()
      AND b.status = 'completed'
      AND b.service_completed_at IS NOT NULL
    )
  );

-- 고객은 자신의 리뷰만 수정 가능
CREATE POLICY "Customers can update own reviews"
  ON reviews
  FOR UPDATE
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

-- 고객은 자신의 리뷰만 삭제 가능
CREATE POLICY "Customers can delete own reviews"
  ON reviews
  FOR DELETE
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_reviews_updated_at_trigger ON reviews;
CREATE TRIGGER update_reviews_updated_at_trigger
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- Function to calculate trainer average rating
CREATE OR REPLACE FUNCTION calculate_trainer_rating(trainer_uuid UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM reviews
    WHERE trainer_id = trainer_uuid
  );
END;
$$ LANGUAGE plpgsql;

-- Add average_rating and review_count to trainers table
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(2,1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Function to update trainer rating stats
CREATE OR REPLACE FUNCTION update_trainer_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
  affected_trainer_id UUID;
BEGIN
  -- Determine which trainer is affected
  IF TG_OP = 'DELETE' THEN
    affected_trainer_id := OLD.trainer_id;
  ELSE
    affected_trainer_id := NEW.trainer_id;
  END IF;

  -- Update trainer stats
  UPDATE trainers
  SET
    average_rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM reviews
      WHERE trainer_id = affected_trainer_id
    ), 0),
    review_count = COALESCE((
      SELECT COUNT(*)
      FROM reviews
      WHERE trainer_id = affected_trainer_id
    ), 0)
  WHERE id = affected_trainer_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update trainer rating stats
DROP TRIGGER IF EXISTS update_trainer_rating_stats_trigger ON reviews;
CREATE TRIGGER update_trainer_rating_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_trainer_rating_stats();
