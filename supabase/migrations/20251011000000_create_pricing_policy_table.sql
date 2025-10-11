-- ====================================
-- Migration: Create platform pricing policy system
-- Version: 001
-- Date: 2025-10-11
-- Description: Create platform_pricing_policy table and add pricing_config to trainers
-- ====================================

-- Create platform_pricing_policy table
CREATE TABLE IF NOT EXISTS platform_pricing_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_recommended INTEGER NOT NULL DEFAULT 15,
  commission_direct INTEGER NOT NULL DEFAULT 20,
  duration_discounts JSONB NOT NULL DEFAULT '{"60": 1.0, "90": 0.95, "120": 0.9}'::jsonb,
  session_prices JSONB NOT NULL DEFAULT '{"1:1": 100000, "2:1": 75000, "3:1": 55000}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default pricing policy
INSERT INTO platform_pricing_policy (
  commission_recommended,
  commission_direct,
  duration_discounts,
  session_prices,
  is_active,
  effective_from
)
VALUES (
  15,  -- 추천 예약 수수료: 15%
  20,  -- 지정 예약 수수료: 20%
  '{"60": 1.0, "90": 0.95, "120": 0.9}'::jsonb,  -- 시간별 할인율
  '{"1:1": 100000, "2:1": 75000, "3:1": 55000}'::jsonb,  -- 세션 타입별 가격
  true,
  NOW()
)
ON CONFLICT DO NOTHING;

-- Add pricing_config to trainers table
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS pricing_config JSONB;

-- Add center_phone to trainers table (if not exists)
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS center_phone TEXT;

-- Migrate existing hourly_rate data to pricing_config
UPDATE trainers
SET pricing_config = jsonb_build_object(
  'use_platform_default', true,
  'custom_hourly_rate', hourly_rate,
  'accept_recommended', true,
  'custom_session_prices', NULL,
  'custom_duration_discounts', NULL
)
WHERE pricing_config IS NULL;

-- Add comments
COMMENT ON TABLE platform_pricing_policy IS '플랫폼 가격 정책 (수수료율, 할인율, 기본 가격)';
COMMENT ON COLUMN trainers.pricing_config IS '트레이너별 가격 설정 (JSONB)';
COMMENT ON COLUMN trainers.center_phone IS '센터 전화번호';

-- Create RLS policies for platform_pricing_policy
ALTER TABLE platform_pricing_policy ENABLE ROW LEVEL SECURITY;

-- Anyone can read active pricing policy
CREATE POLICY "Anyone can read active pricing policy"
  ON platform_pricing_policy
  FOR SELECT
  USING (is_active = true);

-- Only admins can update pricing policy
CREATE POLICY "Only admins can update pricing policy"
  ON platform_pricing_policy
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE user_type = 'admin'
    )
  );

-- Only admins can insert pricing policy
CREATE POLICY "Only admins can insert pricing policy"
  ON platform_pricing_policy
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE user_type = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pricing_policy_active ON platform_pricing_policy(is_active, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_trainers_pricing_config ON trainers USING GIN(pricing_config);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_platform_pricing_policy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_platform_pricing_policy_timestamp
  BEFORE UPDATE ON platform_pricing_policy
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_pricing_policy_updated_at();

-- ====================================
-- Verification Query
-- ====================================
-- Run this to verify the migration:
-- SELECT * FROM platform_pricing_policy WHERE is_active = true;
-- SELECT id, pricing_config FROM trainers LIMIT 5;
