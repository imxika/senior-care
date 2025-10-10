-- 추천 예약의 pending_payment 상태를 허용하도록 제약 조건 수정
-- 변경 사유: 추천 예약 생성 시 pending_payment 상태로 시작하여 결제 완료 후 pending으로 변경

-- 1. 기존 제약조건 제거
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS check_recommended_booking;

-- 2. 새로운 제약조건 적용
ALTER TABLE bookings
  ADD CONSTRAINT check_recommended_booking
  CHECK (
    -- Direct 예약: trainer_id 필수
    (booking_type = 'direct' AND trainer_id IS NOT NULL)
    OR
    -- Recommended 예약: 다양한 상태 허용
    (booking_type = 'recommended' AND (
      -- 매칭 전 (결제 전): trainer_id NULL, pending_payment 상태
      (trainer_id IS NULL AND status = 'pending_payment')
      OR
      -- 매칭 전 (결제 완료): trainer_id NULL, pending 상태
      (trainer_id IS NULL AND status = 'pending')
      OR
      -- 매칭 후: trainer_id 필수 (pending 아닌 모든 상태)
      (trainer_id IS NOT NULL AND status NOT IN ('pending', 'pending_payment'))
      OR
      -- 취소됨: trainer_id는 있거나 없을 수 있음
      (status = 'cancelled')
    ))
  );

-- 3. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '=== pending_payment 상태 허용하도록 제약조건 수정 완료 ===';
END $$;
