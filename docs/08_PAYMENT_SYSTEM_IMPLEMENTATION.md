# 💳 결제 시스템 구현 (Payment System Implementation)

**작성일**: 2025-10-09 (Day 9)
**버전**: 1.0.0
**상태**: ✅ Multi-Provider 결제 시스템 완성

---

## 📋 목차

1. [개요](#개요)
2. [결제 플로우](#결제-플로우)
3. [데이터베이스 스키마](#데이터베이스-스키마)
4. [API 엔드포인트](#api-엔드포인트)
5. [Multi-Provider 지원](#multi-provider-지원)
6. [페이지 구조](#페이지-구조)
7. [보안 고려사항](#보안-고려사항)

---

## 개요

### 구현된 기능

- ✅ **Toss Payments 통합** - 한국 시장 특화 간편결제
- ✅ **Stripe 통합** - 글로벌 결제 및 개발/테스트 편의성
- ✅ **Multi-Provider 선택** - 사용자가 결제 수단 선택 가능
- ✅ **결제 이벤트 추적** - 전체 결제 라이프사이클 로깅
- ✅ **예약-결제 연동** - 결제 완료 시 예약 자동 확정
- ✅ **예약 목록 페이지** - 결제 내역 및 상태 확인

### 기술 스택

```typescript
// Frontend
- Next.js 15.4.6
- @tosspayments/tosspayments-sdk
- @stripe/stripe-js
- TypeScript

// Backend
- Supabase (PostgreSQL)
- Toss Payments API
- Stripe API (SDK: stripe ^18.7.0)

// Database
- payments 테이블
- payment_events 테이블 (이벤트 추적)
- bookings 테이블 (예약 상태 연동)
```

---

## 결제 플로우

### 전체 흐름도

```
[Customer] → [예약 생성] → [결제 수단 선택]
                                ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
            [Toss Payments]          [Stripe Checkout]
                    ↓                       ↓
            [결제 승인 API]          [Session 확인 API]
                    ↓                       ↓
                    └───────────┬───────────┘
                                ↓
                        [Success 페이지]
                                ↓
                        [예약 확정]
                                ↓
                        [/bookings 리다이렉트]
```

### Toss Payments 플로우

```
1. 사용자가 "Toss 결제하기" 선택
2. POST /api/payments/request
   - DB에 payment 레코드 생성 (status: pending)
   - orderId 생성 및 반환
3. Toss SDK로 결제창 호출
   - payment.requestPayment()
4. 사용자가 결제 완료
5. /payments/success?paymentKey=...&orderId=...&amount=... 리다이렉트
6. POST /api/payments/confirm
   - Toss API로 결제 승인 요청
   - DB 업데이트 (status: paid)
   - payment_events에 confirmed 이벤트 기록
   - bookings.status → confirmed
7. 3초 후 /bookings로 자동 리다이렉트
```

### Stripe 플로우

```
1. 사용자가 "Stripe 결제하기" 선택
2. POST /api/payments/request
   - DB에 payment 레코드 생성 (status: pending)
   - orderId 생성 및 반환
3. POST /api/payments/stripe/create-session
   - Stripe Checkout Session 생성
   - session.url 반환
4. Stripe Checkout 페이지로 리다이렉트
5. 사용자가 결제 완료
6. /payments/success?session_id=...&orderId=...&amount=... 리다이렉트
7. POST /api/payments/stripe/confirm
   - Stripe Session 조회
   - payment_status 확인
   - DB 업데이트 (status: paid)
   - payment_events에 confirmed 이벤트 기록
   - bookings.status → confirmed
8. 3초 후 /bookings로 자동 리다이렉트
```

---

## 데이터베이스 스키마

### payments 테이블

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,

  -- 결제 제공자
  payment_provider TEXT NOT NULL DEFAULT 'toss'
    CHECK (payment_provider IN ('toss', 'stripe')),

  -- Toss 관련 필드
  toss_order_id TEXT UNIQUE,
  toss_payment_key TEXT,

  -- 결제 정보
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KRW',
  payment_method TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),

  -- 타임스탬프
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,

  -- 실패/취소 정보
  failure_code TEXT,
  failure_message TEXT,
  cancellation_reason TEXT,

  -- 카드 정보
  card_company TEXT,
  card_number_masked TEXT,

  -- 메타데이터
  payment_metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_provider ON payments(payment_provider);
```

### payment_events 테이블

```sql
CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('created', 'confirmed', 'failed', 'cancelled', 'refunded')),
  event_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_events_payment_id ON payment_events(payment_id);
CREATE INDEX idx_payment_events_type ON payment_events(event_type);
```

### bookings 테이블 (결제 관련 필드)

```sql
ALTER TABLE bookings
ADD COLUMN confirmed_at TIMESTAMPTZ,
ADD COLUMN completed_at TIMESTAMPTZ,
ADD COLUMN cancelled_at TIMESTAMPTZ,
ADD COLUMN cancellation_deadline TIMESTAMPTZ;
```

---

## API 엔드포인트

### 1. POST /api/payments/request

결제 요청 생성 (Toss/Stripe 공통)

**Request Body**:
```typescript
{
  bookingId: string;
  amount: number;
  orderName: string;
  customerName: string;
  paymentProvider: 'toss' | 'stripe';
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    paymentId: string;
    orderId: string;
    amount: number;
    orderName: string;
    customerName: string;
    paymentProvider: 'toss' | 'stripe';
  }
}
```

**처리 로직**:
1. 인증 확인 (Supabase auth.getUser())
2. Customer 정보 조회
3. Booking 정보 조회 및 권한 확인
4. orderId 생성 (BOOKING_{timestamp}_{random})
5. payments 테이블에 레코드 생성
6. payment_events에 'created' 이벤트 기록

---

### 2. POST /api/payments/confirm (Toss)

Toss 결제 승인

**Request Body**:
```typescript
{
  paymentKey: string;
  orderId: string;
  amount: number;
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    paymentId: string;
    paymentKey: string;
    orderId: string;
    amount: number;
    status: string;
    approvedAt: string;
    method: string;
  }
}
```

**처리 로직**:
1. 인증 및 권한 확인
2. DB에서 payment 조회
3. 금액 일치 확인
4. Toss API로 결제 승인 요청
   ```typescript
   POST https://api.tosspayments.com/v1/payments/confirm
   Authorization: Basic {SECRET_KEY}
   {
     paymentKey: string;
     orderId: string;
     amount: number;
   }
   ```
5. DB 업데이트 (status: paid, 카드 정보 저장)
6. payment_events에 'confirmed' 이벤트 기록
7. bookings.status → 'confirmed'

---

### 3. POST /api/payments/stripe/create-session

Stripe Checkout Session 생성

**Request Body**:
```typescript
{
  orderId: string;
  amount: number;
  successUrl: string;
  cancelUrl: string;
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    sessionId: string;
    sessionUrl: string;
  }
}
```

**처리 로직**:
1. 인증 및 권한 확인
2. DB에서 payment 조회
3. Stripe SDK로 Checkout Session 생성
   ```typescript
   stripe.checkout.sessions.create({
     payment_method_types: ['card'],
     line_items: [...],
     mode: 'payment',
     success_url: ...,
     cancel_url: ...,
     metadata: { orderId, paymentId, bookingId }
   })
   ```
4. session.id를 payment_metadata에 저장
5. payment_events에 'created' 이벤트 기록

---

### 4. POST /api/payments/stripe/confirm

Stripe 결제 승인 확인

**Request Body**:
```typescript
{
  sessionId: string;
  orderId: string;
  amount: number;
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    paymentId: string;
    paymentKey: string; // sessionId
    orderId: string;
    amount: number;
    status: string;
    approvedAt: string;
    method: string;
  }
}
```

**처리 로직**:
1. 인증 및 권한 확인
2. DB에서 payment 조회
3. Stripe Session 조회
   ```typescript
   stripe.checkout.sessions.retrieve(sessionId)
   ```
4. payment_status 확인 (must be 'paid')
5. PaymentIntent 조회 (카드 정보용)
6. DB 업데이트 (status: paid, 카드 정보 저장)
7. payment_events에 'confirmed' 이벤트 기록
8. bookings.status → 'confirmed'

---

### 5. GET /api/bookings

예약 목록 조회 (결제 정보 포함)

**Response**:
```typescript
{
  success: true,
  data: [
    {
      id: string;
      customer_id: string;
      trainer_id: string;
      booking_date: string;
      status: string;
      service_type: string;
      created_at: string;

      customer: {
        id: string;
        profile: {
          full_name: string;
          email: string;
        }
      };

      trainer: {
        id: string;
        profile: {
          full_name: string;
          email: string;
        }
      };

      payments: [
        {
          id: string;
          amount: string;
          currency: string;
          payment_method: string;
          payment_status: string;
          payment_provider: string;
          paid_at: string;
          created_at: string;
        }
      ]
    }
  ]
}
```

**처리 로직**:
1. 인증 확인
2. Customer 정보 조회
3. Bookings 조회 (profiles 조인)
   ```sql
   SELECT *,
     customer:customers!bookings_customer_id_fkey(
       id,
       profile:profiles(full_name, email)
     ),
     trainer:trainers(
       id,
       profile:profiles(full_name, email)
     ),
     payments(...)
   FROM bookings
   WHERE customer_id = $1
   ORDER BY created_at DESC
   ```

---

## Multi-Provider 지원

### 설계 철학

**단일 테이블 + Provider 컬럼 방식**:
- `payments` 테이블 하나로 Toss/Stripe 모두 처리
- `payment_provider` 컬럼으로 구분
- 공통 필드 최대한 활용
- Provider별 고유 필드는 JSONB 메타데이터 활용

**장점**:
- 쿼리 간단 (JOIN 불필요)
- 통합 분석 용이
- 새 Provider 추가 쉬움
- Admin 대시보드 구현 간편

**단점**:
- Provider별 특수 필드 타입 안전성 낮음
- NULL 필드 많을 수 있음

### Provider별 특징

#### Toss Payments
- **장점**: 한국 시장 특화, 간편결제, 카카오페이/네이버페이 연동
- **단점**: 테스트 시 앱 설치 필요, 글로벌 결제 불가
- **수수료**: 상대적으로 저렴
- **정산**: 국내 정산 빠름

#### Stripe
- **장점**: 글로벌 결제, 테스트 편리, SDK 우수, 문서 명확
- **단점**: 한국 간편결제 미지원
- **수수료**: 글로벌 표준
- **정산**: 국제 송금

### 사용자 선택 UI

```typescript
// Radio Button 방식
<div className="flex gap-4">
  <label>
    <input
      type="radio"
      name="paymentProvider"
      value="toss"
      checked={paymentProvider === 'toss'}
      onChange={(e) => setPaymentProvider(e.target.value)}
    />
    💳 Toss Payments
  </label>

  <label>
    <input
      type="radio"
      name="paymentProvider"
      value="stripe"
      checked={paymentProvider === 'stripe'}
      onChange={(e) => setPaymentProvider(e.target.value)}
    />
    💵 Stripe
  </label>
</div>
```

---

## 페이지 구조

### /test-payment (테스트 페이지)

**목적**: 개발/테스트용 간편 결제 페이지

**기능**:
- Booking ID 입력
- 금액 입력
- 결제 수단 선택 (Toss/Stripe)
- 인증 상태 표시
- 결제 진행

**파일**: `/app/test-payment/page.tsx`

---

### /payments/success (결제 성공)

**목적**: Toss/Stripe 결제 완료 후 리다이렉트 페이지

**URL 파라미터**:
- Toss: `?paymentKey=...&orderId=...&amount=...`
- Stripe: `?session_id=...&orderId=...&amount=...`

**처리 로직**:
1. URL 파라미터 추출
2. Provider 자동 감지 (paymentKey vs session_id)
3. 해당 Provider의 confirm API 호출
4. 로딩 → 성공 → 리다이렉트

**파일**: `/app/payments/success/page.tsx`

---

### /payments/fail (결제 실패)

**목적**: 결제 실패 시 리다이렉트 페이지

**기능**:
- 에러 메시지 표시
- 다시 시도 버튼
- 예약 목록으로 이동

**파일**: `/app/payments/fail/page.tsx`

---

### /bookings (예약 목록)

**목적**: 사용자의 예약 및 결제 내역 확인

**기능**:
- 예약 목록 표시
- 결제 정보 표시 (Provider, 금액, 상태)
- 상태별 배지 (대기중, 확정됨, 취소됨, 완료됨)
- 결제하기 버튼 (pending 상태)
- 인증 체크

**파일**: `/app/bookings/page.tsx`

---

## 보안 고려사항

### 1. 인증 및 권한

```typescript
// 모든 API에서 필수 체크
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// 본인 예약만 접근 가능
if (payment.customer.profile_id !== user.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### 2. 금액 검증

```typescript
// 프론트엔드와 백엔드 금액 일치 확인
if (parseFloat(payment.amount) !== amount) {
  return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
}
```

### 3. Idempotency

```typescript
// 중복 결제 방지 - orderId UNIQUE 제약
ALTER TABLE payments ADD CONSTRAINT payments_toss_order_id_unique UNIQUE (toss_order_id);

// 이미 결제된 경우 에러 반환
if (payment.payment_status === 'paid') {
  return NextResponse.json({ error: 'Already paid' }, { status: 400 });
}
```

### 4. 환경 변수 보안

```env
# .env.local (절대 커밋 금지!)
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_...
TOSS_SECRET_KEY=test_sk_...

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# NEXT_PUBLIC_*만 브라우저에 노출됨
# SECRET_KEY는 서버 사이드만 사용
```

### 5. SQL Injection 방지

```typescript
// Supabase 클라이언트는 자동으로 Prepared Statement 사용
const { data } = await supabase
  .from('payments')
  .select('*')
  .eq('toss_order_id', orderId)  // ✅ Safe
  .single();
```

### 6. RLS (Row Level Security)

```sql
-- payments 테이블 RLS 정책
CREATE POLICY "Users can view their own payments"
ON payments FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM customers WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own payments"
ON payments FOR INSERT
WITH CHECK (
  customer_id IN (
    SELECT id FROM customers WHERE profile_id = auth.uid()
  )
);
```

---

## 테스트 방법

### Toss Payments 테스트

1. 환경 변수 설정:
```env
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_...
TOSS_SECRET_KEY=test_sk_...
```

2. `/test-payment` 접속
3. Booking ID 입력
4. "💳 Toss Payments" 선택
5. "💳 Toss 결제하기" 클릭
6. Toss 앱에서 결제 (테스트 카드 사용)

### Stripe 테스트

1. 환경 변수 설정:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

2. `/test-payment` 접속
3. Booking ID 입력
4. "💵 Stripe" 선택
5. "💵 Stripe 결제하기" 클릭
6. Stripe Checkout에서 테스트 카드 입력:
   - 카드번호: `4242 4242 4242 4242`
   - 만료일: 미래 날짜 (예: 12/34)
   - CVC: 아무 3자리 (예: 123)

---

## 다음 단계

### 구현 필요 기능

- [ ] **Webhook 처리** - 비동기 결제 상태 업데이트
- [ ] **환불 시스템** - Admin에서 환불 처리
- [ ] **정기 결제** - Subscription 지원 (Stripe)
- [ ] **결제 실패 재시도** - 자동 재결제
- [ ] **Admin 결제 대시보드** - 전체 결제 현황 조회
- [ ] **Trainer 정산 시스템** - 트레이너별 수익 정산
- [ ] **영수증 발급** - PDF 영수증 생성

### 최적화

- [ ] 결제 이벤트 Webhook으로 전환
- [ ] 결제 상태 실시간 업데이트 (Realtime)
- [ ] 결제 통계 및 리포트
- [ ] 환율 자동 계산 (다국가 지원)

---

**문서 작성**: 2025-10-09
**작성자**: Sean Kim
**버전**: 1.0.0
