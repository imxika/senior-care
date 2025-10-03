-- Step 2: Create Indexes
-- 인덱스 생성 (성능 최적화)

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_profile_id ON customers(profile_id);
CREATE INDEX IF NOT EXISTS idx_customers_mobility_level ON customers(mobility_level);

-- Trainers indexes
CREATE INDEX IF NOT EXISTS idx_trainers_profile_id ON trainers(profile_id);
CREATE INDEX IF NOT EXISTS idx_trainers_verified_active ON trainers(is_verified, is_active);
CREATE INDEX IF NOT EXISTS idx_trainers_rating ON trainers(rating DESC);
CREATE INDEX IF NOT EXISTS idx_trainers_service_areas ON trainers USING gin(service_areas);

-- Programs indexes
CREATE INDEX IF NOT EXISTS idx_programs_trainer_id ON programs(trainer_id);
CREATE INDEX IF NOT EXISTS idx_programs_service_type ON programs(service_type);
CREATE INDEX IF NOT EXISTS idx_programs_active ON programs(is_active);

-- Trainer availability indexes
CREATE INDEX IF NOT EXISTS idx_availability_trainer_id ON trainer_availability(trainer_id);
CREATE INDEX IF NOT EXISTS idx_availability_day ON trainer_availability(day_of_week);

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trainer_id ON bookings(trainer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_program_id ON bookings(program_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_trainer_id ON reviews(trainer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_visible ON reviews(is_visible);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
