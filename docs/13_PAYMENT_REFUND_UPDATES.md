# 결제 및 환불 시스템 업데이트 (2025-01-10)

## 📋 개요

결제 및 환불 로직을 Admin과 Customer 간 통일, 부분 환불 기능 추가, 예약 상태 관리 개선

## ✅ 완료된 작업

### 1. Admin과 Customer 환불 로직 통일

#### 문제점
- Admin: UPDATE 방식 (기존 payment 레코드 수정)
- Customer: INSERT 방식 (새로운 negative payment 레코드 생성)
- 두 방식이 달라서 데이터 일관성 문제 발생

#### 해결책
**Customer도 Admin과 동일하게 UPDATE 방식 사용**

**수정된 파일**: `/app/(dashboard)/customer/bookings/[id]/actions.ts`

```typescript
// 변경 전: 새로운 환불 레코드 INSERT
const { error: refundInsertError } = await serviceSupabase
  .from('payments')
  .insert({
    booking_id: bookingId,
    amount: `-${cancellationInfo.refundAmount}`,
    payment_status: 'refunded',
    // ...
  })

// 변경 후: 기존 결제 레코드 UPDATE (Admin 방식과 동일)
const { error: updateError } = await serviceSupabase
  .from('payments')
  .update({
    payment_status: 'refunded',
    refunded_at: new Date().toISOString(),
    payment_metadata: {
      ...paidPayment.payment_metadata,
      refund: {
        ...refundResult,
        reason: `고객 예약 취소 - ${reason}`,
        refundedBy: customer.id,
        refundedAt: new Date().toISOString(),
        cancellationFee: cancellationInfo.cancellationFee,
        refundAmount: cancellationInfo.refundAmount
      }
    }
  })
  .eq('id', paidPayment.id)
```

#### 차이점
- **Admin**: 3가지 환불 옵션 선택 가능 (전액/정책적용/커스텀)
- **Customer**: 자동으로 취소 정책 적용 (시간에 따른 위약금 차감)
- **공통**: 둘 다 Stripe/Toss API 호출, UPDATE 방식으로 DB 업데이트

---

### 2. 부분 환불 기능 구현

#### 문제점
Admin이 취소 정책에 따른 부분 환불을 처리할 수 없었음

#### 해결책
**3가지 환불 타입 라디오 버튼 추가**

**수정된 파일**: `/components/admin/refund-payment-dialog.tsx`

```typescript
type RefundType = 'full' | 'partial' | 'custom'

// 1. 전액 환불 (Full Refund)
// 2. 정책 적용 환불 (Partial - Policy Applied)
//    - 자동으로 취소 정책 계산
//    - 7일+ 전: 0% 위약금
//    - 3-7일: 10% 위약금
//    - 1-3일: 30% 위약금
//    - 24시간 미만: 50% 위약금
// 3. 커스텀 환불 (Custom Amount)
//    - Admin이 직접 금액 입력
```

**취소 정책 계산 통합**
```typescript
const cancellationInfo = bookingDate && startTime
  ? calculateCancellationFee(parseFloat(amount), bookingDate, startTime)
  : null

// 환불 금액 미리보기
{refundType === 'partial' && cancellationInfo && (
  <div className="space-y-2 p-3 bg-muted rounded-lg">
    <div className="flex justify-between text-sm">
      <span>원 금액:</span>
      <span>{formatCurrency(parseFloat(amount))}</span>
    </div>
    <div className="flex justify-between text-sm text-destructive">
      <span>위약금 ({cancellationInfo.feeRate}%):</span>
      <span>-{formatCurrency(cancellationInfo.feeAmount)}</span>
    </div>
    <Separator />
    <div className="flex justify-between font-semibold">
      <span>환불 금액:</span>
      <span>{formatCurrency(cancellationInfo.refundAmount)}</span>
    </div>
  </div>
)}
```

**API 업데이트**: `/app/api/payments/[paymentId]/refund/route.ts`

```typescript
const { reason, refundAmount, cancellationInfo } = body

// Stripe 부분 환불
const amountToRefund = refundAmount
  ? Math.round(refundAmount * 100) // cents로 변환
  : undefined // undefined면 전액 환불

const refund = await stripe.refunds.create({
  payment_intent: paymentIntentId,
  amount: amountToRefund,
  reason: 'requested_by_customer',
  metadata: {
    refund_reason: reason || 'Admin refund',
    refunded_by: user.id,
    refunded_at: new Date().toISOString(),
    ...(cancellationInfo && {
      cancellation_fee: cancellationInfo.feeAmount,
      cancellation_fee_rate: cancellationInfo.feeRate,
      time_category: cancellationInfo.timeCategory
    })
  }
})

// Toss 부분 환불
const cancelBody: any = {
  cancelReason: reason || 'Admin refund'
}
if (refundAmount) {
  cancelBody.cancelAmount = Math.round(refundAmount) // 원 단위
}
```

**Props 추가**: 예약 날짜와 시간 정보 전달
```typescript
interface RefundPaymentDialogProps {
  paymentId: string
  amount: string
  provider: string
  bookingDate?: string // YYYY-MM-DD
  startTime?: string   // HH:MM:SS
}
```

**수정된 사용처**:
- `/components/admin/payments-table-row.tsx`
- `/app/(dashboard)/admin/bookings/[id]/page.tsx`

---

### 3. 예약 상태 관리 개선 - matching_status 필드 추가

#### 문제점
- 추천 예약의 매칭 프로세스를 `status`만으로 추적하기 어려움
- `status: 'pending'`이 "결제 대기"인지 "매칭 대기"인지 구분 불가

#### 해결책
**새로운 `matching_status` 필드 추가**

**마이그레이션**: `/supabase/migrations/20251010013548_add_matching_status.sql`

```sql
-- matching_status 컬럼 추가
ALTER TABLE bookings
ADD COLUMN matching_status TEXT CHECK (
  matching_status IN ('pending', 'matched', 'approved')
);

-- 인덱스 추가
CREATE INDEX idx_bookings_matching_status ON bookings(matching_status);

-- 기존 데이터 초기화
UPDATE bookings
SET matching_status = 'approved'
WHERE booking_type = 'recommended' AND status = 'confirmed';

UPDATE bookings
SET matching_status = 'pending'
WHERE booking_type = 'recommended' AND status = 'pending' AND trainer_id IS NULL;

UPDATE bookings
SET matching_status = 'matched'
WHERE booking_type = 'recommended' AND status = 'pending' AND trainer_id IS NOT NULL;
```

#### 상태 흐름 정리

**지정 예약 (Direct Booking)**
```
예약 생성 (status: pending, matching_status: null)
         ↓
      결제 완료
         ↓
자동 확정 (status: confirmed, matching_status: null)
```

**추천 예약 (Recommended Booking)**
```
예약 생성 (status: pending, matching_status: pending)
         ↓
      결제 완료
         ↓
status: pending 유지, matching_status: pending (매칭 대기)
         ↓
Admin이 트레이너 매칭 (matching_status: matched)
         ↓
트레이너 승인 (status: confirmed, matching_status: approved)
```

#### 수정된 파일들

**예약 생성**: `/app/(public)/booking/recommended/actions.ts`
```typescript
const bookingData = {
  // ...
  status: 'pending',
  matching_status: 'pending', // 추가
}

// 결제 페이지로 리다이렉트
redirect(`/checkout/${booking.id}`)
```

**결제 완료 웹훅**: `/app/api/webhooks/stripe/route.ts`
```typescript
// 지정 예약은 자동 confirmed
if (booking.booking_type === 'direct' && booking.status === 'pending') {
  await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', booking.id)
}
// 추천 예약은 pending 유지 (매칭 대기)
```

**Admin 매칭**: `/app/(dashboard)/admin/bookings/recommended/[id]/match/actions.ts`
```typescript
const { error: updateError } = await supabase
  .from('bookings')
  .update({
    trainer_id: trainerId,
    status: 'pending',
    matching_status: 'matched', // 추가
    admin_matched_at: new Date().toISOString(),
    admin_matched_by: user.id
  })
  .eq('id', bookingId)
```

**트레이너 승인**: `/app/(dashboard)/trainer/bookings/actions.ts`
```typescript
interface BookingUpdateData {
  status: string
  updated_at: string
  matching_status?: string // 추가
  rejection_reason?: string
  rejection_note?: string
}

// 추천 예약 승인 시
if (status === 'confirmed' && booking.booking_type === 'recommended') {
  updateData.matching_status = 'approved'
}
```

**쿼리 업데이트**: 모든 예약 목록 쿼리에 `matching_status` 추가
- `/app/(dashboard)/customer/bookings/page.tsx`
- `/app/(dashboard)/admin/bookings/page.tsx`
- `/app/(dashboard)/trainer/bookings/page.tsx`
- `/app/(dashboard)/admin/bookings/recommended/page.tsx`

---

### 4. 결제 버튼 리다이렉트 수정

#### 문제점
결제 버튼이 잘못된 경로로 이동 (404 에러)

#### 해결책
**수정된 파일**: `/components/customer-booking-detail.tsx`

```typescript
// 변경 전
window.location.href = `/customer/bookings/${booking.id}/payment` // 404

// 변경 후
window.location.href = `/checkout/${booking.id}` // 정상 작동
```

---

### 5. 날짜 표시 타임존 수정

#### 문제점
결제 날짜가 UTC로 표시되어 9시간 차이 발생

#### 해결책
**수정된 파일**: `/components/admin/payments-table-row.tsx`

```typescript
<TableCell className="text-sm">
  {payment.paid_at
    ? new Date(payment.paid_at).toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul'
      })
    : new Date(payment.created_at).toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul'
      })
  }
</TableCell>
```

---

## 🗄️ 데이터베이스 스키마 변경

### bookings 테이블
```sql
-- 추가된 컬럼
matching_status TEXT CHECK (matching_status IN ('pending', 'matched', 'approved'))
-- NULL for direct bookings
-- NOT NULL for recommended bookings

-- 추가된 인덱스
CREATE INDEX idx_bookings_matching_status ON bookings(matching_status);

-- 컬럼 설명
COMMENT ON COLUMN bookings.matching_status IS
  'Matching status for recommended bookings:
   pending (waiting for match),
   matched (trainer assigned),
   approved (trainer accepted).
   NULL for direct bookings.';
```

### payments 테이블 (변경 없음)
```sql
payment_status: 'paid' | 'pending' | 'refunded' | 'cancelled' | 'failed'
refunded_at: TIMESTAMP WITH TIME ZONE
payment_metadata: JSONB {
  refund: {
    refundId: string,
    amount: number,
    status: string,
    provider: 'toss' | 'stripe',
    reason: string,
    refundedBy: string,
    refundedAt: string,
    cancellationFee?: number,  // 부분 환불 시 위약금
    refundAmount?: number       // 부분 환불 시 실제 환불액
  }
}
```

---

## 🧪 테스트 가이드

### 1. 부분 환불 테스트
1. Admin 로그인
2. `/admin/bookings` 또는 `/admin/payments` 접속
3. 결제 완료된 예약의 "환불" 버튼 클릭
4. "정책 적용 환불" 선택
5. 예약 시간에 따라 자동 계산된 금액 확인
6. 환불 사유 입력 후 진행
7. Stripe/Toss API 호출 및 DB 업데이트 확인

### 2. 고객 취소 테스트
1. Customer 로그인
2. `/customer/bookings` 접속
3. 예약 취소 버튼 클릭
4. 취소 사유 입력
5. 자동으로 취소 정책 적용된 환불 금액 확인
6. 결제 레코드가 UPDATE 방식으로 처리되는지 확인

### 3. 추천 예약 플로우 테스트
1. Customer가 추천 예약 생성
2. 결제 완료 (`status: pending, matching_status: pending`)
3. Admin이 트레이너 매칭 (`matching_status: matched`)
4. 트레이너가 승인 (`status: confirmed, matching_status: approved`)
5. 각 단계에서 상태값 확인

### 4. 지정 예약 플로우 테스트
1. Customer가 지정 예약 생성
2. 결제 완료 시 자동으로 `status: confirmed` 되는지 확인
3. `matching_status`는 NULL인지 확인

---

## 📊 수정된 파일 목록

### 핵심 기능
1. `/components/admin/refund-payment-dialog.tsx` - 부분 환불 UI
2. `/app/api/payments/[paymentId]/refund/route.ts` - 부분 환불 API
3. `/app/(dashboard)/customer/bookings/[id]/actions.ts` - Customer 환불 로직 통일

### 상태 관리
4. `/supabase/migrations/20251010013548_add_matching_status.sql` - DB 마이그레이션
5. `/app/(public)/booking/recommended/actions.ts` - matching_status 초기화
6. `/app/api/webhooks/stripe/route.ts` - 결제 완료 시 상태 처리
7. `/app/(dashboard)/admin/bookings/recommended/[id]/match/actions.ts` - 매칭 상태 업데이트
8. `/app/(dashboard)/trainer/bookings/actions.ts` - 승인 상태 업데이트

### 쿼리 업데이트
9. `/app/(dashboard)/customer/bookings/page.tsx`
10. `/app/(dashboard)/admin/bookings/page.tsx`
11. `/app/(dashboard)/trainer/bookings/page.tsx`
12. `/app/(dashboard)/admin/bookings/recommended/page.tsx`

### UI 개선
13. `/components/customer-booking-detail.tsx` - 결제 버튼 리다이렉트 수정
14. `/components/admin/payments-table-row.tsx` - 날짜 타임존 수정, 환불 props 추가
15. `/app/(dashboard)/admin/bookings/[id]/page.tsx` - 환불 props 추가

### 스크립트
16. `/scripts/reset-test-data.sql` - 전체 데이터 초기화
17. `/scripts/reset-payments-only.sql` - 결제 데이터만 초기화
18. `/scripts/reset-payments-reviews-only.sql` - 결제/리뷰만 초기화
19. `/scripts/RESET_GUIDE.md` - 초기화 가이드

---

## 🔄 마이그레이션 가이드

### 1. 데이터베이스 마이그레이션 실행
```bash
# Supabase CLI로 실행
npx supabase db push

# 또는 Supabase Dashboard SQL Editor에서 수동 실행
# 파일: /supabase/migrations/20251010013548_add_matching_status.sql
```

### 2. 기존 데이터 확인
```sql
-- matching_status가 올바르게 설정되었는지 확인
SELECT
  id,
  booking_type,
  status,
  matching_status,
  trainer_id,
  created_at
FROM bookings
WHERE booking_type = 'recommended'
ORDER BY created_at DESC
LIMIT 10;
```

### 3. RLS 정책 확인
```sql
-- matching_status 필드가 RLS 정책에 영향을 주지 않는지 확인
-- 기존 정책에 문제 없음 (SELECT * 사용)
```

---

## 🎯 요약

### 핵심 개선사항
1. ✅ **Admin-Customer 환불 로직 통일**: 둘 다 UPDATE 방식 사용
2. ✅ **부분 환불 기능**: 3가지 옵션 (전액/정책적용/커스텀)
3. ✅ **상태 관리 개선**: `matching_status` 필드로 추천 예약 프로세스 명확화
4. ✅ **예약 플로우 명확화**: 지정/추천 예약의 서로 다른 흐름 구현
5. ✅ **UI/UX 개선**: 결제 버튼 수정, 날짜 타임존 수정

### 비즈니스 로직 정리
- **지정 예약**: 예약 생성 → 결제 → 자동 확정
- **추천 예약**: 예약 생성 → 결제 → 매칭 대기 → Admin 매칭 → 트레이너 승인 → 확정
- **Admin 환불**: 전액/부분/커스텀 선택 가능
- **Customer 환불**: 자동으로 취소 정책 적용

### 데이터 일관성
- ✅ 환불 데이터는 항상 기존 payment 레코드에 UPDATE
- ✅ 추천 예약의 매칭 상태는 `matching_status`로 추적
- ✅ 모든 쿼리에 `matching_status` 포함하여 일관성 유지

---

## 📝 관련 문서
- [11_REFUND_FEATURE.md](./11_REFUND_FEATURE.md) - 환불 기능 초기 구현
- [10_PAYMENT_COMPLETION_SUMMARY.md](./10_PAYMENT_COMPLETION_SUMMARY.md) - 결제 시스템 요약
- [04_DATABASE_SCHEMA.md](./04_DATABASE_SCHEMA.md) - 데이터베이스 스키마
