-- =====================================================
-- Migration 28: Add payment_provider column
-- =====================================================
-- Purpose: Support multiple payment providers (Toss, Stripe)

-- Add payment_provider column
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'toss'
CHECK (payment_provider IN ('toss', 'stripe'));

-- Add index for filtering by provider
CREATE INDEX IF NOT EXISTS idx_payments_provider
ON payments(payment_provider);

-- Add comment
COMMENT ON COLUMN payments.payment_provider IS
  '결제 제공자: toss (토스페이먼츠), stripe (스트라이프)';

-- =====================================================
-- End of Migration
-- =====================================================
