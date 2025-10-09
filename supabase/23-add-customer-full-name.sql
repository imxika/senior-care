-- Migration: Add full_name to customers table
-- Description: 고객(시니어) 본인의 이름을 저장하는 필드 추가
-- Note: guardian_name은 보호자 이름, full_name은 환자 본인 이름

-- 1. full_name 컬럼 추가
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);

-- 2. profiles 테이블에서 full_name 가져오기
-- customers.profile_id와 profiles.id를 매칭하여 full_name 복사
UPDATE customers
SET full_name = profiles.full_name
FROM profiles
WHERE customers.profile_id = profiles.id
  AND customers.full_name IS NULL
  AND profiles.full_name IS NOT NULL;

-- 3. 인덱스 추가 (이름 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_customers_full_name ON customers(full_name);

-- 4. 코멘트 추가
COMMENT ON COLUMN customers.full_name IS '고객(시니어) 본인의 이름 (profiles.full_name에서 복사)';
COMMENT ON COLUMN customers.guardian_name IS '보호자(가디언)의 이름';

-- Note: full_name은 필수는 아님 (NULL 허용)
-- 이유: 기존 레코드와의 호환성, 보호자만 등록하는 케이스 대비
