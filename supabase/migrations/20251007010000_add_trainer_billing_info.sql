-- Add billing information columns to trainers table
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS account_holder_name TEXT,
ADD COLUMN IF NOT EXISTS business_registration_number TEXT,
ADD COLUMN IF NOT EXISTS is_business BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN trainers.bank_name IS '은행명';
COMMENT ON COLUMN trainers.account_number IS '계좌번호';
COMMENT ON COLUMN trainers.account_holder_name IS '예금주명';
COMMENT ON COLUMN trainers.business_registration_number IS '사업자 등록번호 (선택)';
COMMENT ON COLUMN trainers.is_business IS '사업자 여부';
