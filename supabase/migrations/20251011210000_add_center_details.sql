-- Add detailed center information fields
-- Purpose: Support comprehensive center management with photos, accessibility, parking, verification documents

ALTER TABLE centers
ADD COLUMN IF NOT EXISTS has_parking BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parking_description TEXT,
ADD COLUMN IF NOT EXISTS wheelchair_accessible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accessibility_description TEXT,
ADD COLUMN IF NOT EXISTS facility_photos TEXT[], -- Array of image URLs
ADD COLUMN IF NOT EXISTS business_registration_photo TEXT, -- Business registration document URL
ADD COLUMN IF NOT EXISTS operating_hours JSONB, -- {"monday": "09:00-18:00", "tuesday": ...}
ADD COLUMN IF NOT EXISTS amenities TEXT[], -- Array of amenity descriptions
ADD COLUMN IF NOT EXISTS admin_notes TEXT, -- Admin-only notes for verification
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES trainers(id); -- 센터 소유자 (체인점 운영 지원)

-- Add comments
COMMENT ON COLUMN centers.has_parking IS '주차 가능 여부';
COMMENT ON COLUMN centers.parking_description IS '주차 안내 (예: 무료 주차 10대)';
COMMENT ON COLUMN centers.wheelchair_accessible IS '휠체어 접근 가능 여부';
COMMENT ON COLUMN centers.accessibility_description IS '접근성 상세 안내';
COMMENT ON COLUMN centers.facility_photos IS '시설 사진 URL 배열';
COMMENT ON COLUMN centers.business_registration_photo IS '사업자등록증 사진 URL';
COMMENT ON COLUMN centers.operating_hours IS '운영 시간 (요일별 JSON)';
COMMENT ON COLUMN centers.amenities IS '편의시설 목록';
COMMENT ON COLUMN centers.admin_notes IS '관리자 메모 (승인/반려 사유 등)';
COMMENT ON COLUMN centers.owner_id IS '센터 소유자 트레이너 ID (체인점 운영 지원, 최대 3개)';

-- Create index for photo searches
CREATE INDEX IF NOT EXISTS idx_centers_has_photos ON centers((facility_photos IS NOT NULL AND array_length(facility_photos, 1) > 0));
CREATE INDEX IF NOT EXISTS idx_centers_verified_active ON centers(is_verified, is_active) WHERE is_verified = true AND is_active = true;

-- Create index for owner_id
CREATE INDEX IF NOT EXISTS idx_centers_owner_id ON centers(owner_id) WHERE owner_id IS NOT NULL;

-- RLS Policy: 트레이너가 센터 등록 가능 (최대 3개까지 - 체인점 고려)
DROP POLICY IF EXISTS "Trainers can insert their own center" ON centers;
CREATE POLICY "Trainers can insert their own center"
  ON centers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainers
      JOIN profiles ON profiles.id = trainers.profile_id
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'trainer'
      AND trainers.id = owner_id  -- owner_id가 본인 trainer_id와 일치
    )
    AND (
      -- 현재 등록된 센터가 3개 미만인 경우만
      SELECT COUNT(*)
      FROM centers
      JOIN trainers ON trainers.id = centers.owner_id
      JOIN profiles ON profiles.id = trainers.profile_id
      WHERE profiles.id = auth.uid()
    ) < 3
  );

-- RLS Policy: 트레이너가 자기 센터 수정 가능 (승인 전에만)
DROP POLICY IF EXISTS "Trainers can update their own unverified center" ON centers;
CREATE POLICY "Trainers can update their own unverified center"
  ON centers FOR UPDATE
  USING (
    is_verified = false
    AND EXISTS (
      SELECT 1 FROM trainers
      JOIN profiles ON profiles.id = trainers.profile_id
      WHERE trainers.id = centers.owner_id
      AND profiles.id = auth.uid()
      AND profiles.user_type = 'trainer'
    )
  );

-- RLS Policy: 트레이너가 자기 센터 조회 가능
DROP POLICY IF EXISTS "Trainers can view their own center" ON centers;
CREATE POLICY "Trainers can view their own center"
  ON centers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trainers
      JOIN profiles ON profiles.id = trainers.profile_id
      WHERE trainers.id = centers.owner_id
      AND profiles.id = auth.uid()
      AND profiles.user_type = 'trainer'
    )
  );
