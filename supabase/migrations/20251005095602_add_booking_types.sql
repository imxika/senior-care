-- 예약 타입 추가: 지정 예약 vs 추천 예약
-- 작성일: 2025-10-03

-- 1. booking_type enum 생성
DO $$ BEGIN
  CREATE TYPE booking_type AS ENUM ('direct', 'recommended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. bookings 테이블에 새 컬럼 추가
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_type booking_type NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS price_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS admin_matched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_matched_by UUID REFERENCES profiles(id);

-- 3. trainer_id를 nullable로 변경 (추천 예약은 처음에 NULL)
ALTER TABLE bookings
  ALTER COLUMN trainer_id DROP NOT NULL;

-- 4. 추천 예약 상태 관리를 위한 체크 제약
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS check_recommended_booking;

ALTER TABLE bookings
  ADD CONSTRAINT check_recommended_booking
  CHECK (
    (booking_type = 'direct' AND trainer_id IS NOT NULL) OR
    (booking_type = 'recommended' AND (
      (status = 'pending' AND trainer_id IS NULL) OR
      (status != 'pending' AND trainer_id IS NOT NULL)
    ))
  );

-- 5. 가격 multiplier 제약 (1.0 ~ 2.0 범위)
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS check_price_multiplier;

ALTER TABLE bookings
  ADD CONSTRAINT check_price_multiplier
  CHECK (price_multiplier >= 1.00 AND price_multiplier <= 2.00);

-- 6. 기존 데이터 업데이트 (모두 direct로 설정)
UPDATE bookings
SET
  booking_type = 'direct',
  price_multiplier = 1.00
WHERE booking_type IS NULL;

-- 7. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_bookings_type ON bookings(booking_type);
CREATE INDEX IF NOT EXISTS idx_bookings_pending_recommended
  ON bookings(status, booking_type)
  WHERE status = 'pending' AND booking_type = 'recommended';

-- 8. 코멘트 추가
COMMENT ON COLUMN bookings.booking_type IS '예약 타입: direct(지정예약, +30%), recommended(추천예약, 기본가)';
COMMENT ON COLUMN bookings.price_multiplier IS '가격 배수: direct=1.3, recommended=1.0';
COMMENT ON COLUMN bookings.admin_matched_at IS '관리자가 트레이너를 매칭한 시각';
COMMENT ON COLUMN bookings.admin_matched_by IS '트레이너를 매칭한 관리자 ID';
