-- =========================================
-- 안전한 RLS 추가 (기존 정책 유지)
-- =========================================
-- 작성일: 2025-10-10
-- 목적: 기존 웹사이트 영향 없이 Auto-matching 시스템 RLS만 추가
-- 원칙: 기존 정책 절대 건드리지 않음, 신규 정책만 추가

-- ============================================
-- 1. trainer_match_responses 테이블 RLS 활성화
-- ============================================
ALTER TABLE trainer_match_responses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. trainer_match_responses 정책 추가 (신규 테이블)
-- ============================================

-- 트레이너: 자신의 응답 로그만 조회
CREATE POLICY "trainer_responses_select_own"
ON trainer_match_responses FOR SELECT
TO authenticated
USING (
  trainer_id IN (
    SELECT t.id FROM trainers t WHERE t.profile_id = auth.uid()
  )
);

-- Admin: 모든 응답 로그 조회 (모니터링용)
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

-- 시스템: 응답 로그 삽입 (Service Role 우회)
CREATE POLICY "trainer_responses_insert_system"
ON trainer_match_responses FOR INSERT
TO authenticated
WITH CHECK (
  trainer_id IN (
    SELECT t.id FROM trainers t WHERE t.profile_id = auth.uid()
  )
  OR response_type = 'notified'
);

-- ============================================
-- 3. bookings Admin 정책 추가 (기존 정책 유지)
-- ============================================
-- 주의: 기존 bookings_select_trainer, bookings_update_trainer는 건드리지 않음!

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

-- Admin: 모든 예약 수정
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

-- ============================================
-- 검증 쿼리
-- ============================================
-- 실행 후 이 쿼리들로 확인하세요:

-- 1. trainer_match_responses 정책 확인 (3개 있어야 함)
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'trainer_match_responses';

-- 2. bookings 정책 확인 (기존 5개 + 신규 2개 = 7개)
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bookings' ORDER BY policyname;

-- 3. 기존 bookings_select_trainer 정책 그대로 있는지 확인
-- SELECT policyname FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'bookings_select_trainer';
