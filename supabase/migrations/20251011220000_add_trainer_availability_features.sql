-- Add trainer availability toggle and date-specific exceptions

-- 1. Add is_available column to trainers table
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

COMMENT ON COLUMN trainers.is_available IS '트레이너 활성화 상태 (false시 검색/예약 불가)';

CREATE INDEX IF NOT EXISTS idx_trainers_available ON trainers(is_available) WHERE is_available = true;

-- 2. Create trainer_availability_exceptions table for date-specific customization
CREATE TABLE IF NOT EXISTS trainer_availability_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  time_slots TEXT[],
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_trainer_date UNIQUE(trainer_id, date)
);

-- Add comments
COMMENT ON TABLE trainer_availability_exceptions IS '트레이너 날짜별 가능시간 예외 설정';
COMMENT ON COLUMN trainer_availability_exceptions.date IS '예외 적용 날짜';
COMMENT ON COLUMN trainer_availability_exceptions.is_available IS 'false면 해당 날짜 완전 휴무';
COMMENT ON COLUMN trainer_availability_exceptions.time_slots IS '해당 날짜의 가능 시간대 배열 (예: ["09:00-12:00", "14:00-17:00"])';
COMMENT ON COLUMN trainer_availability_exceptions.reason IS '예외 사유 (예: "개인 일정", "워크샵 참석")';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trainer_exceptions_trainer ON trainer_availability_exceptions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_exceptions_date ON trainer_availability_exceptions(date);
CREATE INDEX IF NOT EXISTS idx_trainer_exceptions_lookup ON trainer_availability_exceptions(trainer_id, date);

-- RLS Policies for trainer_availability_exceptions

-- Enable RLS
ALTER TABLE trainer_availability_exceptions ENABLE ROW LEVEL SECURITY;

-- Policy: 트레이너가 자신의 예외 조회
DROP POLICY IF EXISTS "Trainers can view their own availability exceptions" ON trainer_availability_exceptions;
CREATE POLICY "Trainers can view their own availability exceptions"
  ON trainer_availability_exceptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trainers
      JOIN profiles ON profiles.id = trainers.profile_id
      WHERE trainers.id = trainer_availability_exceptions.trainer_id
      AND profiles.id = auth.uid()
      AND profiles.user_type = 'trainer'
    )
  );

-- Policy: 트레이너가 자신의 예외 추가
DROP POLICY IF EXISTS "Trainers can insert their own availability exceptions" ON trainer_availability_exceptions;
CREATE POLICY "Trainers can insert their own availability exceptions"
  ON trainer_availability_exceptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainers
      JOIN profiles ON profiles.id = trainers.profile_id
      WHERE trainers.id = trainer_availability_exceptions.trainer_id
      AND profiles.id = auth.uid()
      AND profiles.user_type = 'trainer'
    )
  );

-- Policy: 트레이너가 자신의 예외 수정
DROP POLICY IF EXISTS "Trainers can update their own availability exceptions" ON trainer_availability_exceptions;
CREATE POLICY "Trainers can update their own availability exceptions"
  ON trainer_availability_exceptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trainers
      JOIN profiles ON profiles.id = trainers.profile_id
      WHERE trainers.id = trainer_availability_exceptions.trainer_id
      AND profiles.id = auth.uid()
      AND profiles.user_type = 'trainer'
    )
  );

-- Policy: 트레이너가 자신의 예외 삭제
DROP POLICY IF EXISTS "Trainers can delete their own availability exceptions" ON trainer_availability_exceptions;
CREATE POLICY "Trainers can delete their own availability exceptions"
  ON trainer_availability_exceptions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trainers
      JOIN profiles ON profiles.id = trainers.profile_id
      WHERE trainers.id = trainer_availability_exceptions.trainer_id
      AND profiles.id = auth.uid()
      AND profiles.user_type = 'trainer'
    )
  );

-- Policy: 고객이 예외 조회 가능 (예약 가능 시간 확인용)
DROP POLICY IF EXISTS "Customers can view availability exceptions" ON trainer_availability_exceptions;
CREATE POLICY "Customers can view availability exceptions"
  ON trainer_availability_exceptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'customer'
    )
  );

-- Policy: 관리자는 모든 권한
DROP POLICY IF EXISTS "Admins have full access to availability exceptions" ON trainer_availability_exceptions;
CREATE POLICY "Admins have full access to availability exceptions"
  ON trainer_availability_exceptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_trainer_availability_exceptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_trainer_availability_exceptions_updated_at ON trainer_availability_exceptions;
CREATE TRIGGER trigger_update_trainer_availability_exceptions_updated_at
  BEFORE UPDATE ON trainer_availability_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION update_trainer_availability_exceptions_updated_at();
