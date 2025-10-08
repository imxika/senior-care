-- =====================================================
-- Migration: Create Split Payments Table
-- Description: 분할 결제 테이블 생성 (N빵 시스템)
-- Version: 1.0
-- Date: 2025-10-09
-- =====================================================

-- split_payments 테이블 생성
CREATE TABLE IF NOT EXISTS split_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 연관 정보
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  parent_payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,  -- 호스트의 원본 결제
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,  -- 참가자

  -- 분할 결제 정보
  split_amount DECIMAL(10,2) NOT NULL CHECK (split_amount > 0),  -- 이 참가자의 분담 금액
  is_host BOOLEAN DEFAULT false,  -- 호스트 여부

  -- 결제 상태
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- 'pending'   : 초대 대기 중
  -- 'invited'   : 초대 발송됨
  -- 'accepted'  : 초대 수락함
  -- 'rejected'  : 초대 거부함
  -- 'paid'      : 결제 완료
  -- 'failed'    : 결제 실패
  -- 'cancelled' : 취소됨

  -- Toss Payments 정보 (참가자 결제 시)
  toss_payment_key VARCHAR(200) UNIQUE,
  toss_order_id VARCHAR(200) UNIQUE,
  payment_method VARCHAR(50),
  card_company VARCHAR(50),
  card_number_masked VARCHAR(20),

  -- 타임스탬프
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- 실패 정보
  failure_code VARCHAR(50),
  failure_message TEXT,

  -- 메타데이터
  payment_metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_split_payments_booking_id ON split_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_split_payments_parent_payment_id ON split_payments(parent_payment_id);
CREATE INDEX IF NOT EXISTS idx_split_payments_customer_id ON split_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_split_payments_status ON split_payments(payment_status);

-- booking당 하나의 호스트만 존재하도록 제약
CREATE UNIQUE INDEX IF NOT EXISTS idx_split_payments_one_host_per_booking
  ON split_payments(booking_id)
  WHERE is_host = true;

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_split_payments_updated_at ON split_payments;
CREATE TRIGGER update_split_payments_updated_at
  BEFORE UPDATE ON split_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE split_payments ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 고객은 본인이 참여한 분할 결제만 조회
DROP POLICY IF EXISTS "Customers can view their own split payments" ON split_payments;
CREATE POLICY "Customers can view their own split payments"
  ON split_payments FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

-- RLS 정책: 호스트는 본인 예약의 모든 분할 결제 조회
DROP POLICY IF EXISTS "Hosts can view all split payments for their bookings" ON split_payments;
CREATE POLICY "Hosts can view all split payments for their bookings"
  ON split_payments FOR SELECT
  USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      WHERE c.profile_id = auth.uid()
    )
  );

-- RLS 정책: 호스트는 본인 예약의 분할 결제 생성 가능
DROP POLICY IF EXISTS "Hosts can create split payments for their bookings" ON split_payments;
CREATE POLICY "Hosts can create split payments for their bookings"
  ON split_payments FOR INSERT
  WITH CHECK (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      WHERE c.profile_id = auth.uid()
    )
  );

-- RLS 정책: 참가자는 본인 분할 결제만 업데이트
DROP POLICY IF EXISTS "Participants can update their own split payments" ON split_payments;
CREATE POLICY "Participants can update their own split payments"
  ON split_payments FOR UPDATE
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

-- RLS 정책: Admin은 모든 분할 결제 조회 및 관리
DROP POLICY IF EXISTS "Admins can manage all split payments" ON split_payments;
CREATE POLICY "Admins can manage all split payments"
  ON split_payments FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE user_type = 'admin'
    )
  );

-- 테이블 코멘트
COMMENT ON TABLE split_payments IS '분할 결제 테이블 (N빵 시스템)';
COMMENT ON COLUMN split_payments.is_host IS '호스트 여부 (예약자)';
COMMENT ON COLUMN split_payments.split_amount IS '참가자별 분담 금액';
COMMENT ON COLUMN split_payments.parent_payment_id IS '호스트의 원본 결제 ID';
