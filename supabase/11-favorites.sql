-- favorites 테이블 생성
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- 고객당 트레이너 중복 즐겨찾기 방지
  UNIQUE(customer_id, trainer_id)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_favorites_customer_id ON public.favorites(customer_id);
CREATE INDEX idx_favorites_trainer_id ON public.favorites(trainer_id);

-- RLS 활성화
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 고객은 자신의 즐겨찾기만 조회
CREATE POLICY "Customers can view own favorites"
ON public.favorites FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.profiles p ON p.id = c.profile_id
    WHERE p.id = auth.uid()
      AND c.id = favorites.customer_id
  )
);

-- RLS 정책: 고객은 즐겨찾기 추가 가능
CREATE POLICY "Customers can insert own favorites"
ON public.favorites FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.profiles p ON p.id = c.profile_id
    WHERE p.id = auth.uid()
      AND c.id = favorites.customer_id
  )
);

-- RLS 정책: 고객은 자신의 즐겨찾기만 삭제
CREATE POLICY "Customers can delete own favorites"
ON public.favorites FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.profiles p ON p.id = c.profile_id
    WHERE p.id = auth.uid()
      AND c.id = favorites.customer_id
  )
);

-- 트레이너는 자신이 즐겨찾기된 목록 조회 가능 (선택사항)
CREATE POLICY "Trainers can view their favorited list"
ON public.favorites FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.trainers t
    JOIN public.profiles p ON p.id = t.profile_id
    WHERE p.id = auth.uid()
      AND t.id = favorites.trainer_id
  )
);

-- 코멘트 추가
COMMENT ON TABLE public.favorites IS '고객의 즐겨찾기 트레이너 목록';
COMMENT ON COLUMN public.favorites.customer_id IS '즐겨찾기를 한 고객 ID';
COMMENT ON COLUMN public.favorites.trainer_id IS '즐겨찾기된 트레이너 ID';
