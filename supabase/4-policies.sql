-- Step 4: Enable RLS and Create Policies
-- Row Level Security 활성화 및 정책 생성

-- ====================================
-- Enable RLS on all tables
-- ====================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ====================================
-- Profiles Policies
-- ====================================

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ====================================
-- Customers Policies
-- ====================================

CREATE POLICY "Customers can view own data"
  ON customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.id = customers.profile_id
    )
  );

CREATE POLICY "Customers can update own data"
  ON customers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.id = customers.profile_id
    )
  );

CREATE POLICY "Customers can insert own data"
  ON customers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.id = customers.profile_id
    )
  );

-- ====================================
-- Trainers Policies
-- ====================================

CREATE POLICY "Public can view verified trainers"
  ON trainers FOR SELECT
  USING (is_verified = true AND is_active = true);

CREATE POLICY "Trainers can view own data"
  ON trainers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.id = trainers.profile_id
    )
  );

CREATE POLICY "Trainers can update own data"
  ON trainers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.id = trainers.profile_id
    )
  );

CREATE POLICY "Trainers can insert own data"
  ON trainers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.id = trainers.profile_id
    )
  );

-- ====================================
-- Programs Policies
-- ====================================

CREATE POLICY "Public can view active programs"
  ON programs FOR SELECT
  USING (is_active = true);

CREATE POLICY "Trainers can manage own programs"
  ON programs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trainers t
      JOIN profiles p ON p.id = t.profile_id
      WHERE p.id = auth.uid()
      AND t.id = programs.trainer_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainers t
      JOIN profiles p ON p.id = t.profile_id
      WHERE p.id = auth.uid()
      AND t.id = programs.trainer_id
    )
  );
