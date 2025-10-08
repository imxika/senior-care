-- =====================================================
-- Migration: Create Split Payment Invitations Table
-- Description: 분할 결제 초대 테이블 생성
-- Version: 1.0
-- Date: 2025-10-09
-- =====================================================

-- split_payment_invitations 테이블 생성
CREATE TABLE IF NOT EXISTS split_payment_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 연관 정보
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  split_payment_id UUID NOT NULL REFERENCES split_payments(id) ON DELETE CASCADE,
  host_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,  -- 초대 발송자 (호스트)

  -- 초대 대상 정보
  invitee_phone VARCHAR(20),           -- 전화번호로 초대 (회원 아닐 수 있음)
  invitee_email VARCHAR(255),          -- 이메일로 초대
  invitee_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,  -- 회원이면 연결

  -- 초대 상태
  invitation_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- 'pending'  : 초대 발송됨, 대기 중
  -- 'accepted' : 수락됨
  -- 'rejected' : 거부됨
  -- 'expired'  : 만료됨
  -- 'cancelled': 호스트가 취소함

  -- 초대 토큰 (보안용 랜덤 토큰)
  invitation_token VARCHAR(100) UNIQUE NOT NULL,

  -- 만료 시간
  expires_at TIMESTAMPTZ NOT NULL,  -- 기본: 생성 후 48시간

  -- 타임스탬프
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- 메시지
  invitation_message TEXT,           -- 호스트가 작성한 메시지
  rejection_reason TEXT,             -- 거부 사유

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_split_payment_invitations_booking_id ON split_payment_invitations(booking_id);
CREATE INDEX IF NOT EXISTS idx_split_payment_invitations_split_payment_id ON split_payment_invitations(split_payment_id);
CREATE INDEX IF NOT EXISTS idx_split_payment_invitations_host_customer_id ON split_payment_invitations(host_customer_id);
CREATE INDEX IF NOT EXISTS idx_split_payment_invitations_invitee_customer_id ON split_payment_invitations(invitee_customer_id);
CREATE INDEX IF NOT EXISTS idx_split_payment_invitations_status ON split_payment_invitations(invitation_status);
CREATE INDEX IF NOT EXISTS idx_split_payment_invitations_token ON split_payment_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_split_payment_invitations_expires_at ON split_payment_invitations(expires_at);

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_split_payment_invitations_updated_at ON split_payment_invitations;
CREATE TRIGGER update_split_payment_invitations_updated_at
  BEFORE UPDATE ON split_payment_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 초대 토큰 자동 생성 트리거
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invitation_token IS NULL OR NEW.invitation_token = '' THEN
    NEW.invitation_token = encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_invitation_token ON split_payment_invitations;
CREATE TRIGGER set_invitation_token
  BEFORE INSERT ON split_payment_invitations
  FOR EACH ROW
  EXECUTE FUNCTION generate_invitation_token();

-- 만료 시간 자동 설정 트리거 (48시간 후)
CREATE OR REPLACE FUNCTION set_invitation_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at = NOW() + INTERVAL '48 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_invitation_expiry_trigger ON split_payment_invitations;
CREATE TRIGGER set_invitation_expiry_trigger
  BEFORE INSERT ON split_payment_invitations
  FOR EACH ROW
  EXECUTE FUNCTION set_invitation_expiry();

-- RLS 활성화
ALTER TABLE split_payment_invitations ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 호스트는 본인이 발송한 초대 조회
DROP POLICY IF EXISTS "Hosts can view their own invitations" ON split_payment_invitations;
CREATE POLICY "Hosts can view their own invitations"
  ON split_payment_invitations FOR SELECT
  USING (
    host_customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

-- RLS 정책: 초대받은 사람은 본인 초대 조회
DROP POLICY IF EXISTS "Invitees can view their invitations" ON split_payment_invitations;
CREATE POLICY "Invitees can view their invitations"
  ON split_payment_invitations FOR SELECT
  USING (
    invitee_customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

-- RLS 정책: 호스트는 초대 생성 가능
DROP POLICY IF EXISTS "Hosts can create invitations" ON split_payment_invitations;
CREATE POLICY "Hosts can create invitations"
  ON split_payment_invitations FOR INSERT
  WITH CHECK (
    host_customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

-- RLS 정책: 호스트는 본인 초대 취소 가능
DROP POLICY IF EXISTS "Hosts can cancel their invitations" ON split_payment_invitations;
CREATE POLICY "Hosts can cancel their invitations"
  ON split_payment_invitations FOR UPDATE
  USING (
    host_customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

-- RLS 정책: 초대받은 사람은 본인 초대 수락/거부 가능
DROP POLICY IF EXISTS "Invitees can update their invitations" ON split_payment_invitations;
CREATE POLICY "Invitees can update their invitations"
  ON split_payment_invitations FOR UPDATE
  USING (
    invitee_customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

-- RLS 정책: Admin은 모든 초대 조회 및 관리
DROP POLICY IF EXISTS "Admins can manage all invitations" ON split_payment_invitations;
CREATE POLICY "Admins can manage all invitations"
  ON split_payment_invitations FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE user_type = 'admin'
    )
  );

-- 테이블 코멘트
COMMENT ON TABLE split_payment_invitations IS '분할 결제 초대 테이블';
COMMENT ON COLUMN split_payment_invitations.invitation_token IS '초대 링크용 랜덤 토큰';
COMMENT ON COLUMN split_payment_invitations.expires_at IS '초대 만료 시간 (기본 48시간)';
COMMENT ON COLUMN split_payment_invitations.invitee_phone IS '초대 대상 전화번호 (비회원 가능)';
COMMENT ON COLUMN split_payment_invitations.invitee_customer_id IS '초대 대상 고객 ID (회원인 경우)';
