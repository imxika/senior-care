-- =====================================================
-- Migration: Create Payments Table
-- Description: 결제 정보를 저장하는 payments 테이블 생성
-- Version: 1.1 (기존 테이블 DROP 후 재생성)
-- Date: 2025-10-09
-- =====================================================

-- 기존 payments 테이블 삭제 (데이터 없음 확인 완료)
DROP TABLE IF EXISTS payments CASCADE;

-- updated_at 자동 업데이트 함수 (없을 경우 생성)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- payments 테이블 생성
CREATE TABLE payments (
  -- 기본 정보
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- 적용된 정책 (결제 당시의 정책 저장)
  applied_policy_id UUID,  -- refund_policies 테이블은 다음 마이그레이션에서 생성

  -- 분할 결제 관련
  parent_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  -- 분할 결제 참여자의 경우: 호스트의 원래 payment_id
  -- NULL: 일반 결제 또는 호스트의 원래 결제

  -- 결제 금액
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'KRW',

  -- 결제 수단
  payment_method VARCHAR(50) NOT NULL,
  -- 'card', 'kakao_pay', 'naver_pay', 'toss_pay', 'bank_transfer'

  card_company VARCHAR(50),             -- '신한', '국민', '삼성' 등
  card_number_masked VARCHAR(20),       -- '1234-****-****-5678'

  -- 토스페이먼츠 정보
  toss_payment_key VARCHAR(200) UNIQUE,     -- 토스 결제 고유 키
  toss_order_id VARCHAR(200) NOT NULL UNIQUE, -- 주문 ID (우리가 생성)
  toss_transaction_key VARCHAR(200),        -- 거래 키

  -- 결제 상태
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- 'pending'         : 결제 대기
  -- 'paid'            : 결제 완료
  -- 'failed'          : 결제 실패
  -- 'cancelled'       : 결제 취소
  -- 'partial_refunded': 부분 환불
  -- 'refunded'        : 전액 환불

  -- 결제 시각
  requested_at TIMESTAMPTZ DEFAULT NOW(),   -- 결제 요청 시각
  paid_at TIMESTAMPTZ,                       -- 결제 완료 시각
  failed_at TIMESTAMPTZ,                     -- 결제 실패 시각
  cancelled_at TIMESTAMPTZ,                  -- 결제 취소 시각

  -- 환불 정보
  refund_amount DECIMAL(10,2) DEFAULT 0 CHECK (refund_amount >= 0),
  refund_reason TEXT,
  refund_policy VARCHAR(50), -- 'full', 'partial_90', 'partial_70', 'partial_50', 'none'
  refunded_at TIMESTAMPTZ,

  -- 메타데이터
  payment_metadata JSONB,  -- 토스 응답 전체 저장
  failure_code VARCHAR(50),
  failure_message TEXT,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_toss_order_id ON payments(toss_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_parent_payment_id ON payments(parent_payment_id);

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 고객은 본인 결제만 조회
DROP POLICY IF EXISTS "Customers can view their own payments" ON payments;
CREATE POLICY "Customers can view their own payments"
  ON payments FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

-- RLS 정책: 트레이너는 본인 예약의 결제 정보 조회 (정산용)
DROP POLICY IF EXISTS "Trainers can view payments for their bookings" ON payments;
CREATE POLICY "Trainers can view payments for their bookings"
  ON payments FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE trainer_id IN (
        SELECT id FROM trainers WHERE profile_id = auth.uid()
      )
    )
  );

-- RLS 정책: Admin은 모든 결제 조회 및 관리
DROP POLICY IF EXISTS "Admins can manage all payments" ON payments;
CREATE POLICY "Admins can manage all payments"
  ON payments FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE user_type = 'admin'
    )
  );

-- 테이블 코멘트
COMMENT ON TABLE payments IS '결제 정보 테이블';
COMMENT ON COLUMN payments.parent_payment_id IS '분할 결제 시 호스트의 원래 payment_id';
COMMENT ON COLUMN payments.applied_policy_id IS '결제 시점의 환불 정책 ID';
COMMENT ON COLUMN payments.toss_order_id IS '토스페이먼츠 주문 ID (ORDER-{bookingId})';
