-- Centers Table
-- 센터 정보를 관리하는 테이블
-- 트레이너들이 소속될 수 있는 센터(시설)를 등록하고 관리

CREATE TABLE IF NOT EXISTS centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 기본 정보
  name TEXT NOT NULL,
  description TEXT,

  -- 주소 정보
  address TEXT NOT NULL,
  detailed_address TEXT,
  postal_code TEXT,

  -- 연락처
  phone TEXT,
  email TEXT,
  website TEXT,

  -- 사업자 정보
  business_registration_number TEXT UNIQUE,  -- 사업자등록번호
  business_owner_name TEXT,                   -- 대표자명

  -- 시설 정보
  facilities JSONB DEFAULT '[]',  -- ["주차장", "샤워실", "락커룸", "PT룸", "GX룸"]
  equipment JSONB DEFAULT '[]',   -- ["러닝머신", "벤치프레스", "덤벨", "케틀벨"]

  -- 운영 정보
  opening_hours JSONB DEFAULT '{}',  -- {"mon": "09:00-21:00", "tue": "09:00-21:00", ...}
  total_area DECIMAL(10,2),          -- 총 면적 (제곱미터)
  max_capacity INTEGER,              -- 최대 수용 인원

  -- 이미지
  images TEXT[] DEFAULT '{}',        -- 센터 사진 URL 배열
  thumbnail_url TEXT,                -- 대표 이미지

  -- 위치 정보 (선택적 - 추후 지도 연동)
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),

  -- 인증 및 상태
  is_verified BOOLEAN DEFAULT false,    -- 관리자 승인 여부
  is_active BOOLEAN DEFAULT true,       -- 운영 중 여부
  verified_at TIMESTAMPTZ,              -- 승인 일시
  verified_by UUID REFERENCES profiles(id),  -- 승인한 관리자

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),  -- 등록한 사람

  -- 검색 최적화
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', COALESCE(name, '') || ' ' || COALESCE(address, ''))
  ) STORED
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_centers_name ON centers(name);
CREATE INDEX IF NOT EXISTS idx_centers_address ON centers(address);
CREATE INDEX IF NOT EXISTS idx_centers_is_verified ON centers(is_verified);
CREATE INDEX IF NOT EXISTS idx_centers_is_active ON centers(is_active);
CREATE INDEX IF NOT EXISTS idx_centers_search_vector ON centers USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_centers_business_registration ON centers(business_registration_number) WHERE business_registration_number IS NOT NULL;

-- 트레이너 테이블에 센터 연결 컬럼 추가
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES centers(id) ON DELETE SET NULL;

-- 센터 ID 인덱스
CREATE INDEX IF NOT EXISTS idx_trainers_center_id ON trainers(center_id) WHERE center_id IS NOT NULL;

-- RLS (Row Level Security) 활성화
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;

-- RLS 정책

-- 모든 사용자가 인증된 센터 조회 가능
CREATE POLICY "Anyone can view verified centers"
  ON centers FOR SELECT
  USING (is_verified = true AND is_active = true);

-- 관리자는 모든 센터 조회 가능
CREATE POLICY "Admins can view all centers"
  ON centers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- 관리자만 센터 등록 가능
CREATE POLICY "Admins can insert centers"
  ON centers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- 관리자만 센터 수정 가능
CREATE POLICY "Admins can update centers"
  ON centers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- 관리자만 센터 삭제 가능
CREATE POLICY "Admins can delete centers"
  ON centers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_centers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER centers_updated_at
  BEFORE UPDATE ON centers
  FOR EACH ROW
  EXECUTE FUNCTION update_centers_updated_at();

-- 컬럼 설명 추가
COMMENT ON TABLE centers IS '트레이너가 소속될 수 있는 센터(시설) 정보';
COMMENT ON COLUMN centers.name IS '센터 이름';
COMMENT ON COLUMN centers.business_registration_number IS '사업자등록번호 (고유값)';
COMMENT ON COLUMN centers.facilities IS '보유 시설 목록 (JSON 배열)';
COMMENT ON COLUMN centers.opening_hours IS '요일별 운영 시간 (JSON 객체)';
COMMENT ON COLUMN centers.is_verified IS '관리자 승인 여부 - true일 때만 공개';
COMMENT ON COLUMN centers.search_vector IS '전체 텍스트 검색을 위한 tsvector (자동 생성)';
COMMENT ON COLUMN trainers.center_id IS '소속 센터 ID (NULL 가능 - 프리랜서 트레이너)';
