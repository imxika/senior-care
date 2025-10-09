-- =====================================================
-- Migration 27: Remove UNIQUE constraint from payments.booking_id
-- =====================================================
-- Purpose: Allow multiple payment attempts for same booking
-- Reason: Users should be able to retry payments (cancelled → new attempt)

-- Drop the UNIQUE constraint on booking_id
ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payments_booking_id_key;

-- Add comment explaining why we allow multiple payments per booking
COMMENT ON COLUMN payments.booking_id IS
  '예약 ID (bookings 테이블 참조) - 여러 결제 시도 가능 (재시도, 취소 후 재결제 등)';

-- =====================================================
-- End of Migration
-- =====================================================
