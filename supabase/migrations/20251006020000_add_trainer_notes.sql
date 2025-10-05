-- Add trainer notes and session summary to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS trainer_notes TEXT,      -- 트레이너 메모 (트레이너만 볼 수 있음)
ADD COLUMN IF NOT EXISTS session_summary TEXT;    -- 세션 요약 (나중에 고객과 공유 가능)

-- RLS 정책: 트레이너 메모는 해당 트레이너만 수정 가능
-- (기존 bookings RLS 정책에 이미 trainer_id 체크가 있으므로 별도 정책 불필요)

-- 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_bookings_trainer_notes ON bookings(trainer_id) WHERE trainer_notes IS NOT NULL;
