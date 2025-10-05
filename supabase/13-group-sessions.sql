-- 그룹 세션 지원을 위한 테이블 및 수정
-- 기존 테이블이 있다면 삭제 후 재생성

-- 0. 기존 테이블 삭제 (있다면)
DROP TABLE IF EXISTS public.booking_participants CASCADE;

-- 1. bookings 테이블에 그룹 세션 필드 추가
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_participants INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT '1:1'; -- '1:1', '2:1', '3:1', 'group'

-- session_type에 대한 체크 제약 추가 (이미 있으면 에러 무시)
DO $$
BEGIN
  ALTER TABLE public.bookings
    ADD CONSTRAINT session_type_check
    CHECK (session_type IN ('1:1', '2:1', '3:1', 'group'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. booking_participants 테이블 생성 (예약 참가자 관리)
CREATE TABLE public.booking_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,

  -- 회원 참가자 (customer_id가 있으면 회원)
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,

  -- 비회원 참가자 정보
  guest_name TEXT,
  guest_phone TEXT,
  guest_email TEXT,
  guest_birth_date DATE,
  guest_gender TEXT CHECK (guest_gender IN ('male', 'female', 'other')),

  -- 결제 정보
  payment_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'cancelled')),
  payment_method TEXT, -- 'card', 'cash', 'transfer', etc.
  paid_at TIMESTAMPTZ,

  -- 참가자 상태
  is_primary BOOLEAN DEFAULT false, -- 예약 주최자 (결제 대표자)
  attendance_status TEXT DEFAULT 'confirmed' CHECK (attendance_status IN ('confirmed', 'attended', 'no_show', 'cancelled')),

  -- 특이사항
  notes TEXT, -- 건강 상태, 특별 요청사항 등

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 회원이거나 비회원 정보가 있어야 함
  CONSTRAINT participant_info_check
    CHECK (
      customer_id IS NOT NULL OR
      (guest_name IS NOT NULL AND guest_phone IS NOT NULL)
    )
);

-- 3. 인덱스 생성
CREATE INDEX idx_booking_participants_booking_id
  ON public.booking_participants(booking_id);
CREATE INDEX idx_booking_participants_customer_id
  ON public.booking_participants(customer_id);
CREATE INDEX idx_booking_participants_payment_status
  ON public.booking_participants(payment_status);

-- 4. RLS 활성화
ALTER TABLE public.booking_participants ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책: 관리자는 모든 참가자 정보 조회 가능
CREATE POLICY "Admins can view all participants"
ON public.booking_participants FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.user_type = 'admin'
  )
);

-- RLS 정책: 트레이너는 자신의 예약 참가자 조회 가능
CREATE POLICY "Trainers can view their booking participants"
ON public.booking_participants FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.trainers t ON t.id = b.trainer_id
    JOIN public.profiles p ON p.id = t.profile_id
    WHERE b.id = booking_participants.booking_id
      AND p.id = auth.uid()
  )
);

-- RLS 정책: 고객은 자신이 참가한 예약의 참가자 조회 가능
CREATE POLICY "Customers can view participants in their bookings"
ON public.booking_participants FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_participants.booking_id
    AND (
      -- 예약 주최자인 경우
      b.customer_id IN (
        SELECT c.id FROM public.customers c
        JOIN public.profiles p ON p.id = c.profile_id
        WHERE p.id = auth.uid()
      )
      OR
      -- 참가자로 등록된 경우
      booking_participants.customer_id IN (
        SELECT c.id FROM public.customers c
        JOIN public.profiles p ON p.id = c.profile_id
        WHERE p.id = auth.uid()
      )
    )
  )
);

-- RLS 정책: 관리자는 참가자 추가/수정 가능
CREATE POLICY "Admins can manage participants"
ON public.booking_participants FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.user_type = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.user_type = 'admin'
  )
);

-- RLS 정책: 트레이너는 참가자 정보 수정 가능 (출석 체크 등)
CREATE POLICY "Trainers can update participants"
ON public.booking_participants FOR UPDATE TO public
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.trainers t ON t.id = b.trainer_id
    JOIN public.profiles p ON p.id = t.profile_id
    WHERE b.id = booking_participants.booking_id
      AND p.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.trainers t ON t.id = b.trainer_id
    JOIN public.profiles p ON p.id = t.profile_id
    WHERE b.id = booking_participants.booking_id
      AND p.id = auth.uid()
  )
);

-- RLS 정책: 고객은 자신의 예약에 참가자 추가 가능
CREATE POLICY "Customers can add participants to their bookings"
ON public.booking_participants FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.customers c ON c.id = b.customer_id
    JOIN public.profiles p ON p.id = c.profile_id
    WHERE b.id = booking_participants.booking_id
      AND p.id = auth.uid()
  )
);

-- 6. 트리거 함수: current_participants 자동 업데이트
CREATE OR REPLACE FUNCTION update_booking_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT/DELETE 시 현재 참가자 수 업데이트
  IF TG_OP = 'INSERT' THEN
    UPDATE public.bookings
    SET current_participants = (
      SELECT COUNT(*) FROM public.booking_participants
      WHERE booking_id = NEW.booking_id
    )
    WHERE id = NEW.booking_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.bookings
    SET current_participants = (
      SELECT COUNT(*) FROM public.booking_participants
      WHERE booking_id = OLD.booking_id
    )
    WHERE id = OLD.booking_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_participant_count ON public.booking_participants;
CREATE TRIGGER trigger_update_participant_count
AFTER INSERT OR DELETE ON public.booking_participants
FOR EACH ROW EXECUTE FUNCTION update_booking_participant_count();

-- 7. 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_booking_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_participants_timestamp ON public.booking_participants;
CREATE TRIGGER trigger_update_participants_timestamp
BEFORE UPDATE ON public.booking_participants
FOR EACH ROW EXECUTE FUNCTION update_booking_participants_updated_at();

-- 8. 기존 예약에 대한 참가자 데이터 마이그레이션
-- 기존 1:1 예약에 대해 customer를 primary participant로 추가
INSERT INTO public.booking_participants (
  booking_id,
  customer_id,
  payment_amount,
  payment_status,
  is_primary,
  attendance_status
)
SELECT
  b.id,
  b.customer_id,
  COALESCE(b.total_price, 0), -- payment_amount: total_price 사용
  CASE
    WHEN b.status = 'completed' THEN 'paid'
    WHEN b.status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END,
  true, -- is_primary
  CASE
    WHEN b.status = 'completed' THEN 'attended'
    WHEN b.status = 'no_show' THEN 'no_show'
    WHEN b.status = 'cancelled' THEN 'cancelled'
    ELSE 'confirmed'
  END
FROM public.bookings b
WHERE b.customer_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 9. 뷰: 예약별 참가자 요약 정보
CREATE OR REPLACE VIEW booking_participants_summary AS
SELECT
  booking_id,
  COUNT(*) as total_participants,
  COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as member_count,
  COUNT(CASE WHEN customer_id IS NULL THEN 1 END) as guest_count,
  SUM(payment_amount) as total_payment,
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_count,
  COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN attendance_status = 'attended' THEN 1 END) as attended_count,
  COUNT(CASE WHEN attendance_status = 'no_show' THEN 1 END) as no_show_count
FROM public.booking_participants
GROUP BY booking_id;

-- 10. 코멘트 추가
COMMENT ON TABLE public.booking_participants IS '예약 참가자 정보 (그룹 세션 지원)';
COMMENT ON COLUMN public.booking_participants.is_primary IS '예약 주최자 (결제 대표자)';
COMMENT ON COLUMN public.booking_participants.customer_id IS '회원인 경우 customer_id 연결';
COMMENT ON COLUMN public.booking_participants.guest_name IS '비회원인 경우 이름';
COMMENT ON COLUMN public.booking_participants.payment_amount IS '이 참가자의 결제 금액 (분할 결제)';

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ Group sessions setup completed successfully!';
  RAISE NOTICE '📊 Existing bookings migrated to booking_participants';
  RAISE NOTICE '🔐 RLS policies activated';
  RAISE NOTICE '⚡ Triggers enabled for auto-updates';
END $$;
