-- =========================================
-- 자동 매칭 시스템 (선착순 + 30분 타임아웃)
-- =========================================

-- 1. bookings 테이블에 필드 추가
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS pending_trainer_ids UUID[],           -- 알림 보낸 트레이너 목록
ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ,              -- 알림 발송 시각
ADD COLUMN IF NOT EXISTS auto_match_deadline TIMESTAMPTZ,      -- 자동 매칭 마감 시간 (30분)
ADD COLUMN IF NOT EXISTS fallback_to_admin BOOLEAN DEFAULT false, -- Admin 개입 필요 여부
ADD COLUMN IF NOT EXISTS admin_notified_at TIMESTAMPTZ;        -- Admin에게 알림 보낸 시각

-- 2. 트레이너 응답 로그 테이블 (Admin 모니터링용)
CREATE TABLE IF NOT EXISTS trainer_match_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL CHECK (response_type IN ('notified', 'viewed', 'accepted', 'declined', 'too_late')),
  decline_reason TEXT,
  decline_note TEXT,
  response_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_bookings_auto_match_deadline
ON bookings(auto_match_deadline)
WHERE matching_status = 'pending' AND fallback_to_admin = false;

CREATE INDEX IF NOT EXISTS idx_bookings_fallback_to_admin
ON bookings(fallback_to_admin)
WHERE fallback_to_admin = true;

CREATE INDEX IF NOT EXISTS idx_trainer_responses_booking
ON trainer_match_responses(booking_id, response_type);

-- 4. 코멘트 추가
COMMENT ON COLUMN bookings.pending_trainer_ids IS 'List of trainer IDs who were notified about this booking (for recommended bookings)';
COMMENT ON COLUMN bookings.notified_at IS 'Timestamp when trainers were notified';
COMMENT ON COLUMN bookings.auto_match_deadline IS 'Deadline for automatic matching (30 minutes after notification). After this, fallback to admin';
COMMENT ON COLUMN bookings.fallback_to_admin IS 'True if no trainer accepted within deadline, requires admin intervention';
COMMENT ON COLUMN bookings.admin_notified_at IS 'Timestamp when admin was notified about failed auto-matching';

COMMENT ON TABLE trainer_match_responses IS 'Logs all trainer responses to booking requests for monitoring and analytics';
COMMENT ON COLUMN trainer_match_responses.response_type IS 'notified: initial notification sent, viewed: trainer viewed the request, accepted: trainer accepted (first one wins), declined: trainer declined, too_late: trainer tried to accept but already matched';

-- 5. RLS 정책 추가
-- ============================================
-- trainer_match_responses 테이블 RLS
-- ============================================
DROP POLICY IF EXISTS "trainer_responses_select_own" ON trainer_match_responses;
DROP POLICY IF EXISTS "trainer_responses_select_by_admin" ON trainer_match_responses;
DROP POLICY IF EXISTS "trainer_responses_insert_system" ON trainer_match_responses;

ALTER TABLE trainer_match_responses ENABLE ROW LEVEL SECURITY;

-- 트레이너: 자신의 응답 로그만 조회 가능
CREATE POLICY "trainer_responses_select_own"
ON trainer_match_responses FOR SELECT
TO authenticated
USING (
  trainer_id IN (
    SELECT t.id FROM trainers t WHERE t.profile_id = auth.uid()
  )
);

-- Admin: 모든 응답 로그 조회 가능 (모니터링용)
CREATE POLICY "trainer_responses_select_by_admin"
ON trainer_match_responses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- 시스템: 응답 로그 삽입
-- (Service Role에서 실행되므로 RLS 우회, 이 정책은 안전장치)
CREATE POLICY "trainer_responses_insert_system"
ON trainer_match_responses FOR INSERT
TO authenticated
WITH CHECK (
  trainer_id IN (
    SELECT t.id FROM trainers t WHERE t.profile_id = auth.uid()
  )
  OR response_type = 'notified' -- 초기 알림 기록
);

-- ============================================
-- bookings 테이블 RLS 업데이트
-- ============================================
-- 기존 정책: bookings_select_trainer 수정 필요
-- pending_trainer_ids에 포함된 트레이너도 조회 가능해야 함

DROP POLICY IF EXISTS "bookings_select_trainer" ON bookings;

-- 트레이너: 자신의 예약 + 추천 요청받은 예약 조회
CREATE POLICY "bookings_select_trainer"
ON bookings FOR SELECT
TO authenticated
USING (
  trainer_id IN (
    SELECT t.id FROM trainers t WHERE t.profile_id = auth.uid()
  )
  OR (
    -- 추천 예약: 알림받은 트레이너는 조회 가능
    booking_type = 'recommended'
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM trainers t
      WHERE t.profile_id = auth.uid()
      AND t.id = ANY(bookings.pending_trainer_ids)
    )
  )
);

-- 트레이너: 추천 예약 수락 시 업데이트 가능
DROP POLICY IF EXISTS "bookings_update_trainer" ON bookings;

CREATE POLICY "bookings_update_trainer"
ON bookings FOR UPDATE
TO authenticated
USING (
  trainer_id IN (
    SELECT t.id FROM trainers t WHERE t.profile_id = auth.uid()
  )
  OR (
    -- 추천 예약: 알림받은 트레이너는 수락 가능
    booking_type = 'recommended'
    AND status = 'pending'
    AND trainer_id IS NULL
    AND EXISTS (
      SELECT 1 FROM trainers t
      WHERE t.profile_id = auth.uid()
      AND t.id = ANY(bookings.pending_trainer_ids)
    )
  )
)
WITH CHECK (
  trainer_id IN (
    SELECT t.id FROM trainers t WHERE t.profile_id = auth.uid()
  )
);

-- ============================================
-- bookings 테이블 Admin 정책 추가
-- ============================================
-- Admin이 모든 예약을 조회하고 관리할 수 있도록 정책 추가
-- (자동 매칭 모니터링, 수동 매칭, 예약 취소 등에 필요)

DROP POLICY IF EXISTS "bookings_select_by_admin" ON bookings;
DROP POLICY IF EXISTS "bookings_update_by_admin" ON bookings;

-- Admin: 모든 예약 조회
CREATE POLICY "bookings_select_by_admin"
ON bookings FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_type = 'admin'
  )
);

-- Admin: 모든 예약 수정 (매칭, 취소, 상태 변경 등)
CREATE POLICY "bookings_update_by_admin"
ON bookings FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_type = 'admin'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_type = 'admin'
  )
);
