-- 추천 예약을 위한 RLS 정책 업데이트
-- 작성일: 2025-10-03

-- 기존 정책 제거 및 재생성

-- 1. 고객 SELECT 정책 (추천 예약도 조회 가능하도록)
DROP POLICY IF EXISTS "고객은 본인 예약만 조회" ON bookings;

CREATE POLICY "고객은 본인 예약만 조회"
ON bookings FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT id FROM customers WHERE profile_id = auth.uid()
  )
);

-- 2. 트레이너 SELECT 정책 (추천 예약 매칭 후 조회 가능하도록)
DROP POLICY IF EXISTS "트레이너는 본인 예약만 조회" ON bookings;

CREATE POLICY "트레이너는 본인 예약만 조회"
ON bookings FOR SELECT
TO authenticated
USING (
  trainer_id IN (
    SELECT id FROM trainers WHERE profile_id = auth.uid()
  ) OR
  -- 추천 예약: trainer_id가 NULL이고 pending 상태는 제외
  (booking_type = 'recommended' AND trainer_id IS NULL AND status = 'pending')
);

-- 3. 관리자 SELECT 정책 (모든 예약 조회)
DROP POLICY IF EXISTS "관리자는 모든 예약 조회" ON bookings;

CREATE POLICY "관리자는 모든 예약 조회"
ON bookings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- 4. 고객 INSERT 정책 (지정 및 추천 예약 생성)
DROP POLICY IF EXISTS "고객은 예약 생성 가능" ON bookings;

CREATE POLICY "고객은 예약 생성 가능"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (
  customer_id IN (
    SELECT id FROM customers WHERE profile_id = auth.uid()
  ) AND
  -- 지정 예약: trainer_id 필수
  -- 추천 예약: trainer_id NULL
  (
    (booking_type = 'direct' AND trainer_id IS NOT NULL) OR
    (booking_type = 'recommended' AND trainer_id IS NULL)
  )
);

-- 5. 관리자 UPDATE 정책 (추천 예약 매칭 권한)
DROP POLICY IF EXISTS "관리자는 모든 예약 수정 가능" ON bookings;

CREATE POLICY "관리자는 모든 예약 수정 가능"
ON bookings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- 6. 트레이너 UPDATE 정책 (본인 예약만 수정)
DROP POLICY IF EXISTS "트레이너는 본인 예약 상태 변경 가능" ON bookings;

CREATE POLICY "트레이너는 본인 예약 상태 변경 가능"
ON bookings FOR UPDATE
TO authenticated
USING (
  trainer_id IN (
    SELECT id FROM trainers WHERE profile_id = auth.uid()
  )
)
WITH CHECK (
  trainer_id IN (
    SELECT id FROM trainers WHERE profile_id = auth.uid()
  )
);

-- 7. 고객 UPDATE 정책 (본인 예약 취소만 가능)
DROP POLICY IF EXISTS "고객은 본인 예약 취소 가능" ON bookings;

CREATE POLICY "고객은 본인 예약 취소 가능"
ON bookings FOR UPDATE
TO authenticated
USING (
  customer_id IN (
    SELECT id FROM customers WHERE profile_id = auth.uid()
  ) AND
  status IN ('pending', 'confirmed')
)
WITH CHECK (
  customer_id IN (
    SELECT id FROM customers WHERE profile_id = auth.uid()
  ) AND
  status = 'cancelled'
);

-- 8. 코멘트 추가
COMMENT ON POLICY "고객은 예약 생성 가능" ON bookings IS '고객은 지정 예약(trainer_id 있음) 또는 추천 예약(trainer_id NULL) 생성 가능';
COMMENT ON POLICY "관리자는 모든 예약 수정 가능" ON bookings IS '관리자는 추천 예약에 트레이너 매칭 및 모든 예약 관리 가능';
