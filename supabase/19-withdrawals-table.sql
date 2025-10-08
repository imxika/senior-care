-- =====================================================
-- Migration: Create Withdrawals Table
-- Description: 트레이너 출금 요청 테이블 생성
-- Version: 1.0
-- Date: 2025-10-09
-- =====================================================

-- withdrawals 테이블 생성
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 연관 정보
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,

  -- 출금 금액
  requested_amount DECIMAL(10,2) NOT NULL CHECK (requested_amount > 0),
  withdrawal_fee DECIMAL(10,2) DEFAULT 0 CHECK (withdrawal_fee >= 0),
  final_amount DECIMAL(10,2) NOT NULL CHECK (final_amount > 0),
  -- final_amount = requested_amount - withdrawal_fee

  -- 출금 상태
  withdrawal_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- 'pending'   : 출금 요청 대기
  -- 'approved'  : 승인됨 (처리 대기)
  -- 'processing': 처리 중
  -- 'completed' : 완료
  -- 'rejected'  : 거부됨
  -- 'failed'    : 실패

  -- 은행 정보
  bank_name VARCHAR(50) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_holder VARCHAR(100) NOT NULL,

  -- 처리 정보
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- Admin who approved
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- 관리자 메모 및 사유
  rejection_reason TEXT,
  failure_reason TEXT,
  admin_notes TEXT,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_withdrawals_trainer_id ON withdrawals(trainer_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(withdrawal_status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_requested_at ON withdrawals(requested_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_approved_by ON withdrawals(approved_by);

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_withdrawals_updated_at ON withdrawals;
CREATE TRIGGER update_withdrawals_updated_at
  BEFORE UPDATE ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 트레이너는 본인 출금만 조회
DROP POLICY IF EXISTS "Trainers can view their own withdrawals" ON withdrawals;
CREATE POLICY "Trainers can view their own withdrawals"
  ON withdrawals FOR SELECT
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE profile_id = auth.uid()
    )
  );

-- RLS 정책: 트레이너는 본인 출금만 요청 가능
DROP POLICY IF EXISTS "Trainers can create their own withdrawals" ON withdrawals;
CREATE POLICY "Trainers can create their own withdrawals"
  ON withdrawals FOR INSERT
  WITH CHECK (
    trainer_id IN (
      SELECT id FROM trainers WHERE profile_id = auth.uid()
    )
  );

-- RLS 정책: Admin은 모든 출금 조회 및 관리
DROP POLICY IF EXISTS "Admins can manage all withdrawals" ON withdrawals;
CREATE POLICY "Admins can manage all withdrawals"
  ON withdrawals FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE user_type = 'admin'
    )
  );

-- 테이블 코멘트
COMMENT ON TABLE withdrawals IS '트레이너 출금 요청 테이블';
COMMENT ON COLUMN withdrawals.requested_amount IS '출금 요청 금액';
COMMENT ON COLUMN withdrawals.withdrawal_fee IS '출금 수수료';
COMMENT ON COLUMN withdrawals.final_amount IS '실제 지급 금액 (요청액 - 수수료)';
COMMENT ON COLUMN withdrawals.approved_by IS '승인한 관리자';
