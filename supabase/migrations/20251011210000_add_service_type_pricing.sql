-- Add service type-based pricing to platform_pricing_policy
-- Issue: Current pricing doesn't distinguish between center_visit and home_visit
-- Solution: Restructure session_prices to support both service types

-- Step 1: Add new column with service type structure
ALTER TABLE platform_pricing_policy ADD COLUMN IF NOT EXISTS session_prices_v2 JSONB DEFAULT '{
  "center_visit": {
    "1:1": 70000,
    "2:1": 52500,
    "3:1": 38500
  },
  "home_visit": {
    "1:1": 100000,
    "2:1": 75000,
    "3:1": 55000
  }
}'::jsonb;

-- Step 2: Add column to trainers table for pricing choice
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS use_platform_pricing BOOLEAN DEFAULT false;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS pricing_choice_date TIMESTAMPTZ;

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trainers_use_platform_pricing
  ON trainers(use_platform_pricing)
  WHERE use_platform_pricing = true;

-- Step 4: Add comments
COMMENT ON COLUMN platform_pricing_policy.session_prices_v2 IS '서비스 타입별 세션 가격 (center_visit, home_visit)';
COMMENT ON COLUMN trainers.use_platform_pricing IS '플랫폼 가격 정책 사용 여부 (true면 추천 시스템 노출)';
COMMENT ON COLUMN trainers.pricing_choice_date IS '가격 정책 선택 일시';

-- Step 5: Update existing active policy with new structure
UPDATE platform_pricing_policy
SET session_prices_v2 = jsonb_build_object(
  'center_visit', jsonb_build_object(
    '1:1', 70000,
    '2:1', 52500,
    '3:1', 38500
  ),
  'home_visit', jsonb_build_object(
    '1:1', 100000,
    '2:1', 75000,
    '3:1', 55000
  )
)
WHERE is_active = true;

-- Step 6: Notes for manual migration after testing
-- After verifying session_prices_v2 works correctly:
-- 1. Update all code to use session_prices_v2
-- 2. Run: ALTER TABLE platform_pricing_policy DROP COLUMN session_prices;
-- 3. Run: ALTER TABLE platform_pricing_policy RENAME COLUMN session_prices_v2 TO session_prices;
