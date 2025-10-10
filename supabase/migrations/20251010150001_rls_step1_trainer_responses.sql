-- =========================================
-- Step 1: trainer_match_responses RLS 정책 추가
-- =========================================
-- 목적: 신규 테이블 RLS 활성화 및 정책 추가
-- 영향: 신규 테이블이므로 기존 시스템 영향 없음
-- 롤백: 20251010150001_rollback.sql 실행

-- RLS 활성화
ALTER TABLE trainer_match_responses ENABLE ROW LEVEL SECURITY;

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

-- 검증 쿼리 (실행 후 확인)
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'trainer_match_responses';
-- 결과: 3개 정책 (select_own, select_by_admin, insert_system)
