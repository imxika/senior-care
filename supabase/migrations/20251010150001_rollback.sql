-- =========================================
-- Step 1 롤백: trainer_match_responses RLS 제거
-- =========================================
-- 실행 조건: Step 1 실행 후 문제 발생 시

-- 정책 삭제
DROP POLICY IF EXISTS "trainer_responses_select_own" ON trainer_match_responses;
DROP POLICY IF EXISTS "trainer_responses_select_by_admin" ON trainer_match_responses;
DROP POLICY IF EXISTS "trainer_responses_insert_system" ON trainer_match_responses;

-- RLS 비활성화 (선택사항)
-- ALTER TABLE trainer_match_responses DISABLE ROW LEVEL SECURITY;

-- 검증 쿼리
-- SELECT policyname FROM pg_policies WHERE tablename = 'trainer_match_responses';
-- 결과: 0개여야 함
