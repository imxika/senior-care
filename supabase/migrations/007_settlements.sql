-- 정산 테이블 생성
-- Trainer에게 지급할 정산 금액을 관리

CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,

    -- 정산 기간
    settlement_period_start DATE NOT NULL,
    settlement_period_end DATE NOT NULL,

    -- 정산 금액
    total_bookings_count INTEGER NOT NULL DEFAULT 0,
    total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0, -- 총 매출
    platform_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 15.00, -- 플랫폼 수수료율 (%)
    platform_commission DECIMAL(10,2) NOT NULL DEFAULT 0, -- 플랫폼 수수료
    trainer_settlement_amount DECIMAL(10,2) NOT NULL DEFAULT 0, -- 트레이너 정산 금액

    -- 정산 상태
    settlement_status TEXT NOT NULL DEFAULT 'pending' CHECK (settlement_status IN ('pending', 'approved', 'paid', 'rejected')),
    -- pending: 정산 대기
    -- approved: 승인 완료
    -- paid: 지급 완료
    -- rejected: 거부

    -- 지급 정보
    payment_method TEXT, -- 지급 방법 (bank_transfer, etc.)
    bank_name TEXT,
    account_number TEXT,
    account_holder TEXT,

    -- 메타데이터
    settlement_metadata JSONB DEFAULT '{}'::jsonb,
    notes TEXT, -- 관리자 메모

    -- 처리 정보
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    paid_by UUID REFERENCES auth.users(id),
    paid_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES auth.users(id),
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 정산 항목 상세 (어떤 예약들이 포함되었는지)
CREATE TABLE IF NOT EXISTS public.settlement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id UUID NOT NULL REFERENCES public.settlements(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,

    -- 예약 정보
    booking_date DATE NOT NULL,
    service_type TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,

    -- 금액 정보
    total_amount DECIMAL(10,2) NOT NULL, -- 총 결제 금액
    platform_commission DECIMAL(10,2) NOT NULL, -- 플랫폼 수수료
    trainer_amount DECIMAL(10,2) NOT NULL, -- 트레이너 수령 금액

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_settlements_trainer ON public.settlements(trainer_id);
CREATE INDEX idx_settlements_status ON public.settlements(settlement_status);
CREATE INDEX idx_settlements_period ON public.settlements(settlement_period_start, settlement_period_end);
CREATE INDEX idx_settlement_items_settlement ON public.settlement_items(settlement_id);
CREATE INDEX idx_settlement_items_booking ON public.settlement_items(booking_id);

-- RLS 정책
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_items ENABLE ROW LEVEL SECURITY;

-- Trainer는 자신의 정산만 조회
CREATE POLICY "Trainers can view own settlements"
    ON public.settlements
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.trainers t
            WHERE t.id = settlements.trainer_id
            AND t.profile_id = auth.uid()
        )
    );

-- Trainer는 자신의 정산 항목만 조회
CREATE POLICY "Trainers can view own settlement items"
    ON public.settlement_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.settlements s
            JOIN public.trainers t ON t.id = s.trainer_id
            WHERE s.id = settlement_items.settlement_id
            AND t.profile_id = auth.uid()
        )
    );

-- Admin은 모든 정산 관리 (Service Role로 처리)
-- Service Role 사용으로 RLS 우회

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_settlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settlements_updated_at
    BEFORE UPDATE ON public.settlements
    FOR EACH ROW
    EXECUTE FUNCTION update_settlements_updated_at();

-- 정산 통계 뷰
CREATE OR REPLACE VIEW public.settlement_stats AS
SELECT
    s.id,
    s.trainer_id,
    s.settlement_period_start,
    s.settlement_period_end,
    s.settlement_status,
    s.total_bookings_count,
    s.total_revenue,
    s.trainer_settlement_amount,
    COUNT(si.id) as items_count,
    t.profile_id,
    p.full_name as trainer_name,
    p.email as trainer_email
FROM public.settlements s
LEFT JOIN public.settlement_items si ON si.settlement_id = s.id
LEFT JOIN public.trainers t ON t.id = s.trainer_id
LEFT JOIN public.profiles p ON p.id = t.profile_id
GROUP BY s.id, t.profile_id, p.full_name, p.email;

COMMENT ON TABLE public.settlements IS '트레이너 정산 관리';
COMMENT ON TABLE public.settlement_items IS '정산 항목 상세';
COMMENT ON VIEW public.settlement_stats IS '정산 통계 뷰';
