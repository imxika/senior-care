-- =====================================================
-- Migration: Payment Events Table
-- Created: 2025-01-09 14:36:35
-- =====================================================
-- Purpose: Track all payment-related events for audit trail and analytics
-- Related: payments table

-- =====================================================
-- 1. Create payment_events table
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 2. Create indexes for common queries
-- =====================================================

-- Index for finding all events of a payment
CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id
ON payment_events(payment_id);

-- Index for filtering by event type
CREATE INDEX IF NOT EXISTS idx_payment_events_event_type
ON payment_events(event_type);

-- Index for time-based queries (analytics)
CREATE INDEX IF NOT EXISTS idx_payment_events_occurred_at
ON payment_events(occurred_at DESC);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_payment_events_payment_event
ON payment_events(payment_id, event_type, occurred_at DESC);

-- =====================================================
-- 3. Add column comments
-- =====================================================

COMMENT ON TABLE payment_events IS '결제 이벤트 이력 테이블 - 모든 결제 관련 이벤트를 추적';
COMMENT ON COLUMN payment_events.id IS '이벤트 고유 ID';
COMMENT ON COLUMN payment_events.payment_id IS '관련 결제 ID (payments 테이블 참조)';
COMMENT ON COLUMN payment_events.event_type IS '이벤트 유형: created, cancelled, confirmed, failed, refunded, partially_refunded';
COMMENT ON COLUMN payment_events.occurred_at IS '이벤트 발생 시각';
COMMENT ON COLUMN payment_events.event_metadata IS '이벤트 관련 추가 정보 (JSON)';
COMMENT ON COLUMN payment_events.created_at IS '레코드 생성 시각';

-- =====================================================
-- 4. RLS (Row Level Security) Policies
-- =====================================================

-- Enable RLS
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Policy 1: Customers can view their own payment events
CREATE POLICY "Customers can view their own payment events"
ON payment_events
FOR SELECT
TO authenticated
USING (
  payment_id IN (
    SELECT p.id
    FROM payments p
    JOIN customers c ON p.customer_id = c.id
    WHERE c.profile_id = auth.uid()
  )
);

-- Policy 2: INSERT는 SECURITY DEFINER 함수(log_payment_event)로만 가능
-- 일반 사용자는 직접 INSERT 불가 (보안상 더 안전)

-- Policy 3: Trainers can view payment events for their bookings
CREATE POLICY "Trainers can view payment events for their bookings"
ON payment_events
FOR SELECT
TO authenticated
USING (
  payment_id IN (
    SELECT p.id
    FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    JOIN trainers t ON b.trainer_id = t.id
    WHERE t.profile_id = auth.uid()
  )
);

-- Policy 4: Admins can manage all payment events
CREATE POLICY "Admins can manage all payment events"
ON payment_events
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- =====================================================
-- 5. Create helper function to log payment events
-- =====================================================

CREATE OR REPLACE FUNCTION log_payment_event(
  p_payment_id UUID,
  p_event_type TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO payment_events (payment_id, event_type, event_metadata)
  VALUES (p_payment_id, p_event_type, p_metadata)
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION log_payment_event IS '결제 이벤트를 기록하는 헬퍼 함수';

-- =====================================================
-- 6. Create view for easy event timeline query
-- =====================================================

CREATE OR REPLACE VIEW payment_event_timeline AS
SELECT
  pe.id AS event_id,
  pe.payment_id,
  pe.event_type,
  pe.occurred_at,
  pe.event_metadata,
  p.booking_id,
  p.customer_id,
  p.amount,
  p.payment_status,
  p.toss_order_id
FROM payment_events pe
JOIN payments p ON pe.payment_id = p.id
ORDER BY pe.occurred_at DESC;

COMMENT ON VIEW payment_event_timeline IS '결제 이벤트 타임라인 뷰 - 결제 정보와 함께 조회';

-- =====================================================
-- End of Migration
-- =====================================================
