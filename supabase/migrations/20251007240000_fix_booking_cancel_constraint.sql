-- 예약 취소를 허용하도록 check_recommended_booking 제약 조건 수정
-- 기존 데이터 확인 및 수정 후 제약조건 적용

-- 1. 먼저 현재 제약조건 제거
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS check_recommended_booking;

-- 2. 기존 데이터 중 문제가 되는 케이스 확인 및 로깅
DO $$
DECLARE
  problematic_bookings RECORD;
BEGIN
  RAISE NOTICE '=== 제약조건 위반 예약 확인 ===';

  FOR problematic_bookings IN
    SELECT
      id,
      booking_type,
      status,
      trainer_id,
      CASE
        WHEN booking_type = 'direct' AND trainer_id IS NULL THEN 'Direct 예약인데 trainer_id가 NULL'
        WHEN booking_type = 'recommended' AND trainer_id IS NULL AND status != 'pending' THEN 'Recommended 예약인데 매칭 안됐는데 pending 아님'
        WHEN booking_type = 'recommended' AND trainer_id IS NOT NULL AND status = 'pending' THEN 'Recommended 예약인데 매칭됐는데 pending 상태'
        ELSE '기타 문제'
      END as issue
    FROM bookings
    WHERE NOT (
      -- Direct 예약: trainer_id 필수
      (booking_type = 'direct' AND trainer_id IS NOT NULL)
      OR
      -- Recommended 예약: 다양한 상태 허용
      (booking_type = 'recommended' AND (
        (trainer_id IS NULL AND status = 'pending')
        OR
        (trainer_id IS NOT NULL AND status != 'pending')
        OR
        (status = 'cancelled')
      ))
    )
  LOOP
    RAISE NOTICE 'ID: %, Type: %, Status: %, Trainer: %, Issue: %',
      problematic_bookings.id,
      problematic_bookings.booking_type,
      problematic_bookings.status,
      problematic_bookings.trainer_id,
      problematic_bookings.issue;
  END LOOP;
END $$;

-- 3. 문제가 되는 데이터 자동 수정
-- Case 1: Direct 예약인데 trainer_id가 NULL인 경우 → recommended로 변경
UPDATE bookings
SET booking_type = 'recommended'
WHERE booking_type = 'direct'
  AND trainer_id IS NULL;

-- Case 2: Recommended 예약이 매칭 안됐는데(trainer_id NULL) pending이 아닌 경우 → pending으로 변경
UPDATE bookings
SET status = 'pending'
WHERE booking_type = 'recommended'
  AND trainer_id IS NULL
  AND status != 'pending'
  AND status != 'cancelled';  -- 취소된 것은 그대로 유지

-- Case 3: Recommended 예약이 매칭됐는데(trainer_id NOT NULL) pending 상태인 경우 → confirmed로 변경
UPDATE bookings
SET status = 'confirmed'
WHERE booking_type = 'recommended'
  AND trainer_id IS NOT NULL
  AND status = 'pending';

-- 4. 수정 결과 확인
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM bookings
  WHERE NOT (
    (booking_type = 'direct' AND trainer_id IS NOT NULL)
    OR
    (booking_type = 'recommended' AND (
      (trainer_id IS NULL AND status = 'pending')
      OR
      (trainer_id IS NOT NULL AND status != 'pending')
      OR
      (status = 'cancelled')
    ))
  );

  IF invalid_count > 0 THEN
    RAISE EXCEPTION '여전히 % 개의 예약이 제약조건을 위반합니다. 수동 확인이 필요합니다.', invalid_count;
  ELSE
    RAISE NOTICE '모든 예약 데이터가 제약조건을 만족합니다.';
  END IF;
END $$;

-- 5. 새로운 제약조건 적용
ALTER TABLE bookings
  ADD CONSTRAINT check_recommended_booking
  CHECK (
    -- Direct 예약: trainer_id 필수
    (booking_type = 'direct' AND trainer_id IS NOT NULL)
    OR
    -- Recommended 예약: 다양한 상태 허용
    (booking_type = 'recommended' AND (
      -- 매칭 전: trainer_id NULL, pending 상태
      (trainer_id IS NULL AND status = 'pending')
      OR
      -- 매칭 후: trainer_id 필수 (pending 아닌 모든 상태)
      (trainer_id IS NOT NULL AND status != 'pending')
      OR
      -- 취소됨: trainer_id는 있거나 없을 수 있음
      (status = 'cancelled')
    ))
  );

-- 6. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '=== 제약조건 적용 완료 ===';
END $$;
