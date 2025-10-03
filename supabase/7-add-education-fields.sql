-- Step 7: Add education fields to trainers table
-- 트레이너 학력 정보 필드 추가

ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS show_education BOOLEAN DEFAULT true;

COMMENT ON COLUMN trainers.education IS '학력 정보 [{"school": "서울대학교", "major": "체육교육", "degree": "학사", "year": "2015"}]';
COMMENT ON COLUMN trainers.show_education IS '학력 정보 공개 여부 (true: 공개, false: 비공개)';

-- 예시 데이터 업데이트
-- UPDATE trainers SET
--   education = '[
--     {"school": "서울대학교", "major": "체육교육학", "degree": "학사", "year": "2015"},
--     {"school": "연세대학교", "major": "물리치료학", "degree": "석사", "year": "2018"}
--   ]'::jsonb,
--   show_education = true
-- WHERE id = 'trainer-uuid-here';
