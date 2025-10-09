-- Add matching_status column to bookings table
ALTER TABLE bookings
ADD COLUMN matching_status TEXT CHECK (matching_status IN ('pending', 'matched', 'approved'));

-- Add index for matching_status queries
CREATE INDEX idx_bookings_matching_status ON bookings(matching_status);

-- Set matching_status for existing bookings
-- 추천 예약이면서 confirmed인 경우 → approved
UPDATE bookings
SET matching_status = 'approved'
WHERE booking_type = 'recommended' AND status = 'confirmed';

-- 추천 예약이면서 pending인 경우 → pending (트레이너 있으면 matched)
UPDATE bookings
SET matching_status = 'pending'
WHERE booking_type = 'recommended' AND status = 'pending' AND trainer_id IS NULL;

UPDATE bookings
SET matching_status = 'matched'
WHERE booking_type = 'recommended' AND status = 'pending' AND trainer_id IS NOT NULL;

-- 지정 예약은 NULL 유지 (기본값)
-- 지정 예약은 matching_status가 NULL이어야 함

-- Add comment
COMMENT ON COLUMN bookings.matching_status IS 'Matching status for recommended bookings: pending (waiting for match), matched (trainer assigned), approved (trainer accepted). NULL for direct bookings.';
