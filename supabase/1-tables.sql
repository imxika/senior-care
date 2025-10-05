-- Step 1: Create Tables
-- 테이블 생성

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================
-- 1. Users & Profiles (사용자 & 프로필)
-- ====================================

-- User profiles (Supabase Auth 확장)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'trainer', 'admin')),
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer details (고객 상세 정보)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE, -- ⚠️ UNIQUE 추가
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  address TEXT,
  address_detail TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  medical_conditions TEXT[], -- 질병/건강 상태
  mobility_level TEXT CHECK (mobility_level IN ('independent', 'assisted', 'wheelchair', 'bedridden')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trainer details (트레이너 상세 정보)
CREATE TABLE IF NOT EXISTS trainers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE, -- ⚠️ UNIQUE 추가
  bio TEXT,
  specialties TEXT[], -- 전문 분야
  certifications TEXT[], -- 자격증
  years_experience INTEGER,
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  hourly_rate DECIMAL(10,2), -- 시간당 요금
  -- Service availability
  home_visit_available BOOLEAN DEFAULT true,
  center_visit_available BOOLEAN DEFAULT true,
  -- Location info
  center_address TEXT,
  center_name TEXT,
  service_areas TEXT[], -- 방문 가능 지역
  -- Status
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- 2. Programs & Services (프로그램 & 서비스)
-- ====================================

-- Rehabilitation programs (재활 프로그램)
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL, -- 시간 (분)
  -- Service type
  service_type TEXT NOT NULL CHECK (service_type IN ('home_visit', 'center_visit', 'both')),
  -- Group size
  max_participants INTEGER DEFAULT 1,
  -- Pricing (per person)
  price_1on1 DECIMAL(10,2),
  price_1on2 DECIMAL(10,2),
  price_1on3 DECIMAL(10,2),
  -- Target audience
  target_mobility TEXT[], -- ['independent', 'assisted', etc.]
  benefits TEXT[],
  equipment_needed TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- 3. Bookings & Schedules (예약 & 일정)
-- ====================================

-- Trainer availability (트레이너 가능 시간)
CREATE TABLE IF NOT EXISTS trainer_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings (예약)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  -- Service details
  service_type TEXT NOT NULL CHECK (service_type IN ('home_visit', 'center_visit')),
  group_size INTEGER DEFAULT 1,
  participant_names TEXT[],
  -- Schedule
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  -- Location
  address TEXT,
  address_detail TEXT,
  -- Pricing
  price_per_person DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES profiles(id),
  cancelled_at TIMESTAMPTZ,
  -- Booking flow tracking
  booking_type TEXT CHECK (booking_type IN ('direct', 'recommended')), -- 예약 유형
  trainer_matched_at TIMESTAMPTZ, -- 트레이너 매칭 시각 (추천 예약용)
  trainer_confirmed_at TIMESTAMPTZ, -- 트레이너 승인 시각
  service_started_at TIMESTAMPTZ, -- 서비스 시작 시각
  service_completed_at TIMESTAMPTZ, -- 서비스 완료 시각
  -- Notes
  customer_notes TEXT,
  trainer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking participants (예약 참여자) - for group bookings
CREATE TABLE IF NOT EXISTS booking_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  relation TEXT, -- e.g., 'spouse', 'friend', 'family'
  medical_conditions TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- 4. Reviews & Ratings (리뷰 & 평가)
-- ====================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE,
  -- Overall rating
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  -- Detailed ratings
  professionalism_rating INTEGER CHECK (professionalism_rating BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  effectiveness_rating INTEGER CHECK (effectiveness_rating BETWEEN 1 AND 5),
  -- Trainer response
  trainer_response TEXT,
  trainer_response_at TIMESTAMPTZ,
  -- Visibility
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- 5. Payments (결제)
-- ====================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL, -- 'card', 'transfer', 'toss', etc.
  payment_key TEXT, -- Toss payment key
  order_id TEXT, -- Unique order ID
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'partially_refunded')),
  paid_at TIMESTAMPTZ,
  -- Refund
  refunded_at TIMESTAMPTZ,
  refund_amount DECIMAL(10,2),
  refund_reason TEXT,
  -- Receipt
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- 6. Notifications (알림)
-- ====================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'booking', 'payment', 'review', 'system'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- Deep link to related content
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
