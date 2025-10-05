-- 추천 예약 체크 제약 조건 수정
-- 변경 사유: 추천 예약도 트레이너 매칭 후 pending 상태에서 트레이너 승인 대기

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS check_recommended_booking;

ALTER TABLE bookings
  ADD CONSTRAINT check_recommended_booking
  CHECK (
    (booking_type = 'direct' AND trainer_id IS NOT NULL) OR
    (booking_type = 'recommended' AND (
      -- 추천 예약은 매칭 전에는 trainer_id NULL, pending 상태
      (trainer_id IS NULL AND status = 'pending') OR
      -- 매칭 후에는 trainer_id 있음 (pending, confirmed, cancelled 등 모든 상태 가능)
      (trainer_id IS NOT NULL)
    ))
  );
