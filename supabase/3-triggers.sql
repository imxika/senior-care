-- Step 3: Create Triggers
-- 트리거 생성 (자동 업데이트)

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trainers_updated_at
  BEFORE UPDATE ON trainers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trainer_availability_updated_at
  BEFORE UPDATE ON trainer_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update trainer rating when review is created/updated
CREATE OR REPLACE FUNCTION update_trainer_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE trainers
  SET
    rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM reviews
      WHERE trainer_id = NEW.trainer_id AND is_visible = true
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE trainer_id = NEW.trainer_id AND is_visible = true
    )
  WHERE id = NEW.trainer_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply rating update trigger
CREATE TRIGGER update_trainer_rating_on_review
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_trainer_rating();
