-- =====================================================
-- Migration: Create Trainer Credits Table
-- Description: 트레이너 크레딧 & 보증금 관리 테이블 생성
-- Version: 1.0
-- Date: 2025-10-09
-- =====================================================

-- trainer_credits 테이블 생성
CREATE TABLE IF NOT EXISTS trainer_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 연관 정보
  trainer_id UUID NOT NULL UNIQUE REFERENCES trainers(id) ON DELETE CASCADE,

  -- 크레딧 잔액
  available_credits DECIMAL(10,2) DEFAULT 0 CHECK (available_credits >= 0),
  -- 사용 가능한 크레딧 (정산액 누적 - 출금액 - 페널티)

  pending_credits DECIMAL(10,2) DEFAULT 0 CHECK (pending_credits >= 0),
  -- 정산 대기 중인 크레딧 (15일 이내)

  total_earned DECIMAL(10,2) DEFAULT 0 CHECK (total_earned >= 0),
  -- 총 누적 수익 (전체 정산 받은 금액)

  total_withdrawn DECIMAL(10,2) DEFAULT 0 CHECK (total_withdrawn >= 0),
  -- 총 출금액

  total_penalty DECIMAL(10,2) DEFAULT 0 CHECK (total_penalty >= 0),
  -- 총 페널티 금액 (트레이너 취소 등)

  -- 보증금 관리
  deposit_required DECIMAL(10,2) DEFAULT 200000 CHECK (deposit_required >= 0),
  -- 필수 보증금 (기본 200,000원)

  deposit_status VARCHAR(20) DEFAULT 'insufficient',
  -- 'sufficient'   : 보증금 충분
  -- 'at_risk'      : 보증금 부족 위험 (50% 이상)
  -- 'insufficient' : 보증금 미달

  -- 출금 가능 금액 (계산됨: available_credits - deposit_required)
  withdrawable_amount DECIMAL(10,2) GENERATED ALWAYS AS (
    GREATEST(available_credits - deposit_required, 0)
  ) STORED,

  -- 계정 상태
  account_status VARCHAR(20) DEFAULT 'active',
  -- 'active'    : 활성
  -- 'suspended' : 정지 (보증금 미달 등)
  -- 'closed'    : 폐쇄

  suspension_reason TEXT,

  -- 타임스탬프
  last_settlement_at TIMESTAMPTZ,
  last_withdrawal_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_trainer_credits_trainer_id ON trainer_credits(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_credits_deposit_status ON trainer_credits(deposit_status);
CREATE INDEX IF NOT EXISTS idx_trainer_credits_account_status ON trainer_credits(account_status);

-- 보증금 상태 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_deposit_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.available_credits >= NEW.deposit_required THEN
    NEW.deposit_status = 'sufficient';
  ELSIF NEW.available_credits >= (NEW.deposit_required * 0.5) THEN
    NEW.deposit_status = 'at_risk';  -- 보증금의 50% 이상
  ELSE
    NEW.deposit_status = 'insufficient';
  END IF;

  -- 보증금 미달 시 계정 상태 업데이트
  IF NEW.deposit_status = 'insufficient' AND NEW.account_status = 'active' THEN
    NEW.account_status = 'suspended';
    NEW.suspension_reason = '보증금 미달 (200,000원 필요)';
  ELSIF NEW.deposit_status = 'sufficient' AND NEW.account_status = 'suspended'
        AND NEW.suspension_reason LIKE '%보증금%' THEN
    NEW.account_status = 'active';
    NEW.suspension_reason = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_deposit_status ON trainer_credits;
CREATE TRIGGER set_deposit_status
  BEFORE INSERT OR UPDATE OF available_credits ON trainer_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_deposit_status();

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_trainer_credits_updated_at ON trainer_credits;
CREATE TRIGGER update_trainer_credits_updated_at
  BEFORE UPDATE ON trainer_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE trainer_credits ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 트레이너는 본인 크레딧만 조회
DROP POLICY IF EXISTS "Trainers can view their own credits" ON trainer_credits;
CREATE POLICY "Trainers can view their own credits"
  ON trainer_credits FOR SELECT
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE profile_id = auth.uid()
    )
  );

-- RLS 정책: Admin은 모든 크레딧 조회 및 관리
DROP POLICY IF EXISTS "Admins can manage all credits" ON trainer_credits;
CREATE POLICY "Admins can manage all credits"
  ON trainer_credits FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE user_type = 'admin'
    )
  );

-- 테이블 코멘트
COMMENT ON TABLE trainer_credits IS '트레이너 크레딧 & 보증금 관리 테이블';
COMMENT ON COLUMN trainer_credits.available_credits IS '사용 가능한 크레딧';
COMMENT ON COLUMN trainer_credits.pending_credits IS '정산 대기 중인 크레딧 (15일 이내)';
COMMENT ON COLUMN trainer_credits.deposit_required IS '필수 보증금 (기본 200,000원)';
COMMENT ON COLUMN trainer_credits.withdrawable_amount IS '출금 가능 금액 (available_credits - deposit_required)';
