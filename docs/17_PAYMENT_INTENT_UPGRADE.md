# Payment Intent 업그레이드 (Authorization + Capture)

**작성일**: 2025-01-11
**작성자**: Claude Code
**버전**: 1.0

## 📋 목차

- [개요](#개요)
- [변경 사항](#변경-사항)
- [결제 플로우](#결제-플로우)
- [취소 정책](#취소-정책)
- [API 변경사항](#api-변경사항)
- [테스트 가이드](#테스트-가이드)

---

## 개요

### 기존 시스템 (Checkout Session)

```
예약 → 즉시 결제 → 트레이너 승인 → 서비스 완료
       (돈 빠짐)    (거절 시 환불)
```

**문제점**:
- 트레이너 거절 시 환불 처리 필요
- 고객이 승인 전 결제되어 심리적 부담

### 새로운 시스템 (Payment Intent)

```
예약 → 카드 Hold → 트레이너 승인 → 실제 청구 → 서비스 완료
       (돈 안 빠짐)  (Capture)       (돈 빠짐)
                     (거절 시 Cancel, 환불 불필요!)
```

**개선점**:
- ✅ 트레이너 거절 시 환불 불필요 (Hold만 해제)
- ✅ 고객 취소 시 부분 청구 (Partial Capture)
- ✅ 24시간 승인 시스템과 완벽 호환
- ✅ 보안 개선 (Stripe Elements 사용)

---

## 변경 사항

### 새로 추가된 파일

1. **`/api/payments/stripe/create-intent/route.ts`**
   - Payment Intent 생성 (Manual Capture)

2. **`/api/payments/stripe/capture/route.ts`**
   - Payment Intent Capture (실제 청구)

3. **`/api/payments/stripe/cancel-intent/route.ts`**
   - Payment Intent Cancel (Hold 해제)

4. **`/checkout/[bookingId]/StripePaymentForm.tsx`**
   - Stripe Elements 결제 폼

5. **`/checkout/[bookingId]/CheckoutContent.tsx`**
   - 결제 플로우 관리 컴포넌트

### 수정된 파일

1. **`/api/payments/request/route.ts`**
   - Checkout Session → Payment Intent 생성으로 변경

2. **`/api/payments/stripe/confirm/route.ts`**
   - 즉시 결제 → 카드 Hold (authorized) 처리로 변경

3. **`/checkout/[bookingId]/PaymentProviderButton.tsx`**
   - Client Secret 전달 방식으로 변경

4. **`/checkout/[bookingId]/page.tsx`**
   - CheckoutContent 컴포넌트 통합

5. **`/(dashboard)/trainer/bookings/actions.ts`**
   - 승인 시 Capture, 거절 시 Cancel 추가

6. **`/(dashboard)/customer/bookings/[id]/actions.ts`**
   - Partial Capture 로직 추가

### 새로 설치된 패키지

```bash
npm install @stripe/react-stripe-js
```

---

## 결제 플로우

### 1. 예약 생성 및 카드 Hold

```typescript
// 1. 고객이 예약 생성
POST /api/bookings/create
→ booking_status: 'pending_payment'

// 2. 결제 페이지에서 Stripe 선택
POST /api/payments/request (provider: 'stripe')
→ Payment Intent 생성 (capture_method: 'manual')
→ Client Secret 반환

// 3. Stripe Elements로 카드 정보 입력
→ stripe.confirmPayment()
→ Payment Intent status: 'requires_capture'

// 4. 카드 Hold 완료
POST /api/payments/stripe/confirm
→ payment_status: 'authorized' (돈 안 빠짐!)
→ booking_status: 'pending' (트레이너 승인 대기)
→ 트레이너에게 알림 전송
```

### 2-1. 트레이너 승인 (24시간 내)

```typescript
// 트레이너가 예약 승인
POST /api/bookings/updateStatus (status: 'confirmed')

// Payment Intent Capture 실행
→ stripe.paymentIntents.capture(paymentIntentId)
→ payment_status: 'paid' (실제 청구!)
→ booking_status: 'confirmed'
→ 고객에게 승인 알림 전송
```

### 2-2. 트레이너 거절

```typescript
// 트레이너가 예약 거절
POST /api/bookings/updateStatus (status: 'cancelled')

// Payment Intent Cancel 실행
→ stripe.paymentIntents.cancel(paymentIntentId)
→ payment_status: 'cancelled' (Hold 해제)
→ booking_status: 'rejected'
→ 환불 불필요! (실제 청구 안 됐으므로)
```

### 3-1. 고객 취소 (승인 전 - authorized)

```typescript
// 고객이 예약 취소 (트레이너 승인 전)
POST /api/customer/bookings/[id]/cancel

// 취소 수수료 계산
const { feeAmount, refundAmount } = calculateCancellationFee(
  totalPrice,
  booking_date,
  start_time
)

// Partial Capture 또는 Cancel
if (feeAmount > 0) {
  // 수수료만 청구
  stripe.paymentIntents.capture(paymentIntentId, {
    amount_to_capture: feeAmount
  })
  → payment_status: 'paid' (수수료만 청구됨)
} else {
  // 전액 환불 (Hold 해제)
  stripe.paymentIntents.cancel(paymentIntentId)
  → payment_status: 'cancelled'
}
```

### 3-2. 고객 취소 (승인 후 - paid)

```typescript
// 고객이 예약 취소 (트레이너 승인 후)
POST /api/customer/bookings/[id]/cancel

// 취소 수수료 계산
const { feeAmount, refundAmount } = calculateCancellationFee(
  totalPrice,
  booking_date,
  start_time
)

// 부분 환불
stripe.refunds.create({
  payment_intent: paymentIntentId,
  amount: refundAmount
})
→ payment_status: 'refunded'
```

---

## 취소 정책

### 기간별 수수료

```typescript
// lib/constants.ts
export const CANCELLATION_POLICY = {
  FEES: {
    DAYS_7_PLUS: 0,      // 7일 이상 전: 0% 수수료 (무료 취소)
    DAYS_3_TO_7: 0.3,    // 3-7일 전: 30% 수수료
    DAYS_1_TO_3: 0.5,    // 1-3일 전: 50% 수수료
    HOURS_24: 0.8,       // 24시간 이내: 80% 수수료
    NO_SHOW: 1.0         // 노쇼: 100% 수수료
  }
}
```

### 수수료 계산 예시

**예약 금액: 100,000원**

| 취소 시점 | 수수료 | 고객 환불 | 처리 방식 (authorized) |
|---------|-------|---------|---------------------|
| 7일 전 | 0원 (0%) | 100,000원 | Cancel (Hold 해제) |
| 5일 전 | 30,000원 (30%) | 70,000원 | Capture 30,000원 |
| 2일 전 | 50,000원 (50%) | 50,000원 | Capture 50,000원 |
| 12시간 전 | 80,000원 (80%) | 20,000원 | Capture 80,000원 |

---

## API 변경사항

### 새로운 Payment 상태

```typescript
payment_status:
  | 'pending'      // 결제 대기
  | 'authorized'   // 🆕 카드 Hold (청구 안 됨)
  | 'paid'         // 결제 완료 (청구됨)
  | 'cancelled'    // 취소됨
  | 'refunded'     // 환불됨
  | 'failed'       // 실패
```

### API 엔드포인트

#### 1. Payment Intent 생성

```typescript
POST /api/payments/request
{
  "bookingId": "uuid",
  "amount": 100000,
  "paymentProvider": "stripe",
  "orderName": "예약 결제 #abc123",
  "customerName": "홍길동"
}

Response:
{
  "success": true,
  "data": {
    "paymentId": "uuid",
    "orderId": "order_abc123_timestamp",
    "clientSecret": "pi_xxx_secret_yyy",
    "amount": 100000,
    "paymentProvider": "stripe"
  }
}
```

#### 2. Payment Intent 승인 (카드 Hold)

```typescript
POST /api/payments/stripe/confirm
{
  "paymentIntentId": "pi_xxx",
  "bookingId": "uuid"
}

Response:
{
  "success": true,
  "data": {
    "paymentId": "uuid",
    "paymentIntentId": "pi_xxx",
    "amount": 100000,
    "status": "authorized"  // 카드 Hold 상태
  }
}
```

#### 3. Payment Intent Capture (실제 청구)

```typescript
POST /api/payments/stripe/capture
{
  "paymentId": "uuid"
}

Response:
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_xxx",
    "amount": 100000,
    "status": "succeeded"
  }
}
```

#### 4. Payment Intent Cancel (Hold 해제)

```typescript
POST /api/payments/stripe/cancel-intent
{
  "paymentId": "uuid",
  "reason": "trainer_rejected"
}

Response:
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_xxx",
    "status": "canceled",
    "cancellationReason": "trainer_rejected"
  }
}
```

---

## 테스트 가이드

### 테스트 시나리오

#### 시나리오 1: 정상 플로우

1. ✅ 고객이 예약 생성
2. ✅ Stripe Elements로 카드 입력
3. ✅ 카드 Hold 완료 (`authorized`)
4. ✅ 트레이너 승인
5. ✅ 실제 청구 완료 (`paid`)
6. ✅ 서비스 완료

#### 시나리오 2: 트레이너 거절

1. ✅ 고객이 예약 생성
2. ✅ 카드 Hold 완료 (`authorized`)
3. ✅ 트레이너 거절
4. ✅ Hold 해제 (`cancelled`)
5. ✅ 환불 불필요 확인

#### 시나리오 3: 고객 취소 (승인 전 - 7일 전)

1. ✅ 고객이 예약 생성
2. ✅ 카드 Hold 완료 (`authorized`)
3. ✅ 고객이 7일 전 취소
4. ✅ Hold 해제 (`cancelled`)
5. ✅ 수수료 0원 확인

#### 시나리오 4: 고객 취소 (승인 전 - 3일 전)

1. ✅ 고객이 예약 생성
2. ✅ 카드 Hold 완료 (`authorized`)
3. ✅ 고객이 3일 전 취소
4. ✅ 30% Partial Capture (`paid`)
5. ✅ 수수료 30% 확인

#### 시나리오 5: 고객 취소 (승인 후)

1. ✅ 고객이 예약 생성
2. ✅ 카드 Hold 완료 (`authorized`)
3. ✅ 트레이너 승인 → 실제 청구 (`paid`)
4. ✅ 고객이 취소
5. ✅ 부분 환불 처리 (`refunded`)

### Stripe 테스트 카드

```
카드 번호: 4242 4242 4242 4242
만료일: 12/34
CVC: 123
우편번호: 12345
```

### 테스트 확인 사항

1. **Stripe Dashboard**
   - Payment Intent 생성 확인
   - Hold 상태 확인 (`requires_capture`)
   - Capture/Cancel 실행 확인

2. **DB 확인**
   ```sql
   -- Payment 상태 확인
   SELECT id, payment_status, payment_metadata
   FROM payments
   WHERE booking_id = 'uuid';

   -- Payment Events 확인
   SELECT event_type, metadata, created_at
   FROM payment_events
   WHERE payment_id = 'uuid'
   ORDER BY created_at DESC;
   ```

3. **알림 확인**
   - 트레이너에게 승인 요청 알림
   - 고객에게 승인 완료 알림
   - 고객에게 거절 알림

---

## 문제 해결

### Payment Intent 생성 실패

**증상**: `clientSecret`이 null

**원인**: Stripe API Key 설정 오류

**해결**:
```bash
# .env.local 확인
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

### Capture 실패

**증상**: `Payment Intent status is not requires_capture`

**원인**: Payment Intent가 이미 capture되었거나 cancel됨

**해결**:
- Stripe Dashboard에서 Payment Intent 상태 확인
- DB에서 payment_status 확인
- 중복 요청 방지 로직 확인

### Partial Capture 실패

**증상**: `amount_to_capture exceeds authorized amount`

**원인**: 원금보다 큰 금액을 capture하려고 함

**해결**:
- 수수료 계산 로직 확인
- KRW는 소수점 없이 정수로 전달

---

## 마이그레이션 가이드

### 기존 예약 처리

기존에 Checkout Session으로 결제된 예약들은:
- ✅ 정상 동작 (환불 로직 유지)
- ✅ `payment_status: 'paid'` 유지
- ✅ 취소 시 기존 환불 로직 적용

### 새로운 예약

2025-01-11 이후 예약들은:
- ✅ Payment Intent 사용
- ✅ `payment_status: 'authorized' → 'paid'` 플로우
- ✅ 취소 시 Partial Capture 또는 환불

---

## 참고 자료

- [Stripe Payment Intents](https://stripe.com/docs/payments/payment-intents)
- [Stripe Manual Capture](https://stripe.com/docs/payments/capture-later)
- [Stripe Partial Capture](https://stripe.com/docs/payments/capture-later/partial-capture)
- [Stripe Elements](https://stripe.com/docs/stripe-js)

---

**마지막 업데이트**: 2025-01-11
**작성자**: Claude Code
**버전**: 1.0
