-- Step 8: Add additional profile fields
-- 프로필 테이블에 추가 필드 추가
-- 실행 순서: 7-add-education-fields.sql → 8-add-profile-fields.sql → 9-seed-trainers.sql

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS address_detail TEXT,
ADD COLUMN IF NOT EXISTS id_card_url TEXT,
ADD COLUMN IF NOT EXISTS business_license_url TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN profiles.email IS '이메일 (Supabase Auth와 동기화용)';
COMMENT ON COLUMN profiles.address IS '주소';
COMMENT ON COLUMN profiles.address_detail IS '상세 주소';
COMMENT ON COLUMN profiles.id_card_url IS '신분증 사본 URL';
COMMENT ON COLUMN profiles.business_license_url IS '사업자등록증 URL (트레이너용)';
COMMENT ON COLUMN profiles.verified_at IS '본인인증 완료 시각';
COMMENT ON COLUMN profiles.notes IS '관리자 메모';
