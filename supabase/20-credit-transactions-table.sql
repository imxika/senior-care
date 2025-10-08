-- =====================================================
-- Migration: Create Credit Transactions Table
-- Description: 크레딧 거래 내역 테이블 생성
-- Version: 1.0
-- Date: 2025-10-09
-- =====================================================

-- credit_transactions 테이블 생성
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 연관 정보
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,

  -- 거래 유형
  transaction_type VARCHAR(30) NOT NULL,
  -- 'settlement'        : 정산 적립
  -- 'withdrawal'        : 출금 차감
  -- 'penalty'           : 페널티 차감
  -- 'refund_adjustment' : 환불 조정
  -- 'manual_adjustment' : 수동 조정 (관리자)
  -- 'bonus'             : 보너스 적립

  -- 금액 정보
  amount DECIMAL(10,2) NOT NULL,  -- 양수: 적립, 음수: 차감
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,

  -- 연관 참조
  settlement_id UUID REFERENCES settlements(id) ON DELETE SET NULL,
  withdrawal_id UUID REFERENCES withdrawals(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- 설명 및 메모
  description TEXT NOT NULL,
  admin_notes TEXT,
  processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- Admin who processed (for manual adjustments)

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_credit_transactions_trainer_id ON credit_transactions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_settlement_id ON credit_transactions(settlement_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_withdrawal_id ON credit_transactions(withdrawal_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_booking_id ON credit_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- RLS 활성화
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 트레이너는 본인 거래 내역만 조회
DROP POLICY IF EXISTS "Trainers can view their own transactions" ON credit_transactions;
CREATE POLICY "Trainers can view their own transactions"
  ON credit_transactions FOR SELECT
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE profile_id = auth.uid()
    )
  );

-- RLS 정책: Admin은 모든 거래 내역 조회 및 관리
DROP POLICY IF EXISTS "Admins can manage all transactions" ON credit_transactions;
CREATE POLICY "Admins can manage all transactions"
  ON credit_transactions FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE user_type = 'admin'
    )
  );

-- 테이블 코멘트
COMMENT ON TABLE credit_transactions IS '크레딧 거래 내역 테이블 (불변 로그)';
COMMENT ON COLUMN credit_transactions.amount IS '거래 금액 (양수: 적립, 음수: 차감)';
COMMENT ON COLUMN credit_transactions.balance_before IS '거래 전 잔액';
COMMENT ON COLUMN credit_transactions.balance_after IS '거래 후 잔액';
COMMENT ON COLUMN credit_transactions.processed_by IS '수동 조정 처리한 관리자';
