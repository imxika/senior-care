-- Add business verification fields to trainers table
-- Purpose: Allow trainers to upload business registration documents for center verification

ALTER TABLE trainers
ADD COLUMN business_registration_file_url TEXT,
ADD COLUMN business_verified BOOLEAN DEFAULT false,
ADD COLUMN business_verification_requested_at TIMESTAMPTZ,
ADD COLUMN business_verified_at TIMESTAMPTZ,
ADD COLUMN business_verified_by UUID REFERENCES profiles(id),
ADD COLUMN business_rejection_reason TEXT;

-- Add comments
COMMENT ON COLUMN trainers.business_registration_file_url IS 'URL to uploaded business registration document (사업자등록증)';
COMMENT ON COLUMN trainers.business_verified IS 'Whether the business registration has been verified by admin';
COMMENT ON COLUMN trainers.business_verification_requested_at IS 'Timestamp when trainer requested verification';
COMMENT ON COLUMN trainers.business_verified_at IS 'Timestamp when admin verified the business';
COMMENT ON COLUMN trainers.business_verified_by IS 'Admin profile ID who verified the business';
COMMENT ON COLUMN trainers.business_rejection_reason IS 'Reason for rejection if verification was denied';

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_trainers_business_verification_pending
  ON trainers(business_verification_requested_at)
  WHERE business_verified = false AND business_registration_file_url IS NOT NULL;

-- Add comment on the index
COMMENT ON INDEX idx_trainers_business_verification_pending IS
  'Index for finding pending business verification requests in admin dashboard';
