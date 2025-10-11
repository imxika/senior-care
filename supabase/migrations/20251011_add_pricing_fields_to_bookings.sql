-- ====================================
-- Migration: Add pricing fields to bookings table
-- Version: 002
-- Date: 2025-10-11
-- Description: Add platform_commission and trainer_payout columns to bookings table for new pricing system
-- ====================================

-- Add new columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS platform_commission DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS trainer_payout DECIMAL(10,2);

-- Add comment to explain the columns
COMMENT ON COLUMN bookings.platform_commission IS '플랫폼 수수료 금액 (booking_type에 따라 15% 또는 20%)';
COMMENT ON COLUMN bookings.trainer_payout IS '트레이너 실 수령액 (total_price - platform_commission)';

-- Create index for reporting queries
CREATE INDEX IF NOT EXISTS idx_bookings_commission ON bookings(platform_commission);
CREATE INDEX IF NOT EXISTS idx_bookings_trainer_payout ON bookings(trainer_payout);

-- ====================================
-- Verification Query
-- ====================================
-- Run this to verify the migration:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'bookings'
-- AND column_name IN ('platform_commission', 'trainer_payout');
