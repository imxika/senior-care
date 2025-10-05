-- 거절 사유 enum 타입 추가
DO $$ BEGIN
  CREATE TYPE rejection_reason AS ENUM (
    'personal_emergency',     -- 개인 사정
    'health_issue',          -- 건강 문제
    'schedule_conflict',     -- 일정 충돌
    'distance_too_far',      -- 거리가 너무 멈
    'customer_requirements', -- 고객 요구사항 불일치
    'other'                  -- 기타
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- bookings 테이블에 거절 사유 필드 추가
DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN rejection_reason rejection_reason;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN rejection_note TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- 트레이너 가능 시간 테이블 생성
CREATE TABLE IF NOT EXISTS trainer_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,

  -- 요일 (0=일요일, 1=월요일, ..., 6=토요일)
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),

  -- 시작/종료 시간
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- 활성화 여부
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 한 트레이너가 같은 요일에 여러 시간대를 설정할 수 있음
  UNIQUE(trainer_id, day_of_week, start_time, end_time)
);

-- 트레이너 가능 시간 RLS 설정
ALTER TABLE trainer_availability ENABLE ROW LEVEL SECURITY;

-- 트레이너는 자신의 가능 시간만 조회/수정 가능
DROP POLICY IF EXISTS "Trainers can view their own availability" ON trainer_availability;
CREATE POLICY "Trainers can view their own availability"
  ON trainer_availability
  FOR SELECT
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Trainers can insert their own availability" ON trainer_availability;
CREATE POLICY "Trainers can insert their own availability"
  ON trainer_availability
  FOR INSERT
  WITH CHECK (
    trainer_id IN (
      SELECT id FROM trainers WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Trainers can update their own availability" ON trainer_availability;
CREATE POLICY "Trainers can update their own availability"
  ON trainer_availability
  FOR UPDATE
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Trainers can delete their own availability" ON trainer_availability;
CREATE POLICY "Trainers can delete their own availability"
  ON trainer_availability
  FOR DELETE
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE profile_id = auth.uid()
    )
  );

-- 관리자는 모든 트레이너 가능 시간 조회 가능
DROP POLICY IF EXISTS "Admins can view all availability" ON trainer_availability;
CREATE POLICY "Admins can view all availability"
  ON trainer_availability
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_trainer_availability_trainer ON trainer_availability(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_availability_day ON trainer_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_bookings_rejection_reason ON bookings(rejection_reason);

-- 업데이트 트리거
DROP TRIGGER IF EXISTS update_trainer_availability_updated_at ON trainer_availability;
CREATE TRIGGER update_trainer_availability_updated_at
  BEFORE UPDATE ON trainer_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
