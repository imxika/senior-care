-- =====================================================
-- Migration: Create Settlements Table
-- Description: 트레이너 정산 기록 테이블 생성
-- Version: 1.0
-- Date: 2025-10-09
-- =====================================================

-- settlements 테이블 생성
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 연관 정보
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,

  -- 정산 금액
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),      -- 총 결제 금액
  platform_fee DECIMAL(10,2) NOT NULL CHECK (platform_fee >= 0),     -- 플랫폼 수수료 (15%)
  settlement_amount DECIMAL(10,2) NOT NULL CHECK (settlement_amount >= 0), -- 트레이너 정산액 (85%)

  -- 정산 상태
  settlement_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- 'pending'    : 정산 대기 중 (서비스 완료 후 15일 이내)
  -- 'available'  : 정산 가능 (15일 경과)
  -- 'completed'  : 정산 완료 (크레딧 적립됨)
  -- 'cancelled'  : 정산 취소 (환불 등으로 인해)

  -- 정산 시각
  service_completed_at TIMESTAMPTZ NOT NULL,           -- 서비스 완료 시각
  settlement_available_at TIMESTAMPTZ NOT NULL,        -- 정산 가능 시각 (완료 + 15일)
  settlement_completed_at TIMESTAMPTZ,                 -- 정산 완료 시각 (크레딧 적립 시각)

  -- 메타데이터
  notes TEXT,                                          -- 관리자 메모

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_settlements_booking_id ON settlements(booking_id);
CREATE INDEX IF NOT EXISTS idx_settlements_payment_id ON settlements(payment_id);
CREATE INDEX IF NOT EXISTS idx_settlements_trainer_id ON settlements(trainer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(settlement_status);
CREATE INDEX IF NOT EXISTS idx_settlements_available_at ON settlements(settlement_available_at);

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_settlements_updated_at ON settlements;
CREATE TRIGGER update_settlements_updated_at
  BEFORE UPDATE ON settlements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 트레이너는 본인 정산만 조회
DROP POLICY IF EXISTS "Trainers can view their own settlements" ON settlements;
CREATE POLICY "Trainers can view their own settlements"
  ON settlements FOR SELECT
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE profile_id = auth.uid()
    )
  );

-- RLS 정책: Admin은 모든 정산 조회 및 관리
DROP POLICY IF EXISTS "Admins can manage all settlements" ON settlements;
CREATE POLICY "Admins can manage all settlements"
  ON settlements FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE user_type = 'admin'
    )
  );

-- 테이블 코멘트
COMMENT ON TABLE settlements IS '트레이너 정산 기록 테이블';
COMMENT ON COLUMN settlements.platform_fee IS '플랫폼 수수료 (기본 15%)';
COMMENT ON COLUMN settlements.settlement_amount IS '트레이너 정산액 (총액의 85%)';
COMMENT ON COLUMN settlements.settlement_available_at IS '정산 가능 시각 (서비스 완료 + 15일)';
