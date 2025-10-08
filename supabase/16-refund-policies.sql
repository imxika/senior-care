-- =====================================================
-- Migration: Create Refund Policies Table
-- Description: 동적 환불 정책 관리 테이블 생성
-- Version: 1.0
-- Date: 2025-10-09
-- =====================================================

-- refund_policies 테이블 생성
CREATE TABLE IF NOT EXISTS refund_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 정책 정보
  policy_name VARCHAR(100) NOT NULL DEFAULT 'default',
  is_active BOOLEAN DEFAULT true,

  -- 환불율 (취소 시점별)
  refund_rate_72h_plus DECIMAL(3,2) DEFAULT 0.90 CHECK (refund_rate_72h_plus >= 0 AND refund_rate_72h_plus <= 1),
  refund_rate_48_72h DECIMAL(3,2) DEFAULT 0.70 CHECK (refund_rate_48_72h >= 0 AND refund_rate_48_72h <= 1),
  refund_rate_24_48h DECIMAL(3,2) DEFAULT 0.50 CHECK (refund_rate_24_48h >= 0 AND refund_rate_24_48h <= 1),
  refund_rate_under_24h DECIMAL(3,2) DEFAULT 0.00 CHECK (refund_rate_under_24h >= 0 AND refund_rate_under_24h <= 1),

  -- 시간 경계 (hours)
  boundary_long_hours INTEGER DEFAULT 72 CHECK (boundary_long_hours > 0),
  boundary_medium_hours INTEGER DEFAULT 48 CHECK (boundary_medium_hours > 0),
  boundary_short_hours INTEGER DEFAULT 24 CHECK (boundary_short_hours > 0),

  -- 트레이너 취소 설정
  trainer_cancellation_refund_rate DECIMAL(3,2) DEFAULT 1.00 CHECK (trainer_cancellation_refund_rate >= 0 AND trainer_cancellation_refund_rate <= 1),
  trainer_penalty_rate DECIMAL(3,2) DEFAULT 0.15 CHECK (trainer_penalty_rate >= 0 AND trainer_penalty_rate <= 1),

  -- 플랫폼 설정
  platform_fee_rate DECIMAL(5,4) DEFAULT 0.15 CHECK (platform_fee_rate >= 0 AND platform_fee_rate <= 1),
  settlement_waiting_days INTEGER DEFAULT 15 CHECK (settlement_waiting_days >= 0),
  trainer_deposit_required DECIMAL(10,2) DEFAULT 200000 CHECK (trainer_deposit_required >= 0),

  -- 메타데이터
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 유니크 제약: 활성 정책은 하나만
CREATE UNIQUE INDEX IF NOT EXISTS idx_refund_policies_active_unique
  ON refund_policies(is_active)
  WHERE is_active = true;

-- 논리적 제약: 시간 경계는 순서대로 (long > medium > short)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_boundary_order'
  ) THEN
    ALTER TABLE refund_policies ADD CONSTRAINT check_boundary_order
      CHECK (boundary_long_hours > boundary_medium_hours AND boundary_medium_hours > boundary_short_hours);
  END IF;
END $$;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_refund_policies_is_active ON refund_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_refund_policies_created_at ON refund_policies(created_at);

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_refund_policies_updated_at ON refund_policies;
CREATE TRIGGER update_refund_policies_updated_at
  BEFORE UPDATE ON refund_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE refund_policies ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모두가 활성 정책 조회 가능
DROP POLICY IF EXISTS "Everyone can view active refund policy" ON refund_policies;
CREATE POLICY "Everyone can view active refund policy"
  ON refund_policies FOR SELECT
  USING (is_active = true);

-- RLS 정책: Admin만 정책 관리 가능
DROP POLICY IF EXISTS "Admins can manage refund policies" ON refund_policies;
CREATE POLICY "Admins can manage refund policies"
  ON refund_policies FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE user_type = 'admin'
    )
  );

-- payments 테이블에 FK 제약 추가 (15-payments-table.sql에서 생성된 테이블)
ALTER TABLE payments
ADD CONSTRAINT fk_payments_applied_policy
FOREIGN KEY (applied_policy_id)
REFERENCES refund_policies(id)
ON DELETE SET NULL;

-- 기본 환불 정책 데이터 삽입
INSERT INTO refund_policies (
  policy_name,
  is_active,
  refund_rate_72h_plus,
  refund_rate_48_72h,
  refund_rate_24_48h,
  refund_rate_under_24h,
  boundary_long_hours,
  boundary_medium_hours,
  boundary_short_hours,
  trainer_cancellation_refund_rate,
  trainer_penalty_rate,
  platform_fee_rate,
  settlement_waiting_days,
  trainer_deposit_required,
  description
) VALUES (
  'default',
  true,
  0.90,  -- 72시간 이상: 90% 환불
  0.70,  -- 48-72시간: 70% 환불
  0.50,  -- 24-48시간: 50% 환불
  0.00,  -- 24시간 미만: 환불 없음
  72,
  48,
  24,
  1.00,  -- 트레이너 취소: 100% 환불
  0.15,  -- 트레이너 페널티: 15%
  0.15,  -- 플랫폼 수수료: 15%
  15,    -- 정산 대기: 15일
  200000, -- 보증금: 200,000원
  '기본 환불 정책 - 시스템 초기 설정'
)
ON CONFLICT DO NOTHING;

-- 테이블 코멘트
COMMENT ON TABLE refund_policies IS '환불 정책 설정 테이블 - Admin이 동적으로 조정 가능';
COMMENT ON COLUMN refund_policies.is_active IS '활성 정책 여부 (한 번에 하나만 활성)';
COMMENT ON COLUMN refund_policies.boundary_long_hours IS '장기 취소 기준 시간 (이상)';
COMMENT ON COLUMN refund_policies.boundary_medium_hours IS '중기 취소 기준 시간';
COMMENT ON COLUMN refund_policies.boundary_short_hours IS '단기 취소 기준 시간';
COMMENT ON COLUMN refund_policies.trainer_deposit_required IS '트레이너 필수 보증금 (기본 200,000원)';
