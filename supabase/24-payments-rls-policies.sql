-- Migration: Add INSERT and UPDATE RLS policies for payments table
-- Description: 고객이 본인의 결제를 생성/수정할 수 있도록 정책 추가
-- Note: 기존 RLS 정책을 절대 건드리지 않고, 새로운 INSERT/UPDATE 정책만 추가

-- 기존 정책 (건드리지 않음):
-- 1. "Customers can view their own payments" (SELECT) ✅
-- 2. "Trainers can view payments for their bookings" (SELECT) ✅
-- 3. "Admins can manage all payments" (ALL) ✅

-- 추가할 정책 (2개만):

-- 1. INSERT 정책: 본인의 예약에 대한 결제만 생성 가능
CREATE POLICY "Users can create payments for their own bookings"
ON payments
FOR INSERT
TO authenticated
WITH CHECK (
  customer_id IN (
    SELECT id FROM customers WHERE profile_id = auth.uid()
  )
);

-- 2. UPDATE 정책: 본인의 결제 내역만 수정 가능 (결제 상태 업데이트용)
CREATE POLICY "Users can update their own payments"
ON payments
FOR UPDATE
TO authenticated
USING (
  customer_id IN (
    SELECT id FROM customers WHERE profile_id = auth.uid()
  )
)
WITH CHECK (
  customer_id IN (
    SELECT id FROM customers WHERE profile_id = auth.uid()
  )
);

-- Note:
-- - 기존 정책 3개는 절대 수정/삭제하지 않음
-- - INSERT/UPDATE 정책 2개만 추가
-- - DELETE 정책은 의도적으로 만들지 않음 (결제 내역 보존 필요)
