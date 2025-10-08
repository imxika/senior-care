# 💰 결제 & 정산 시스템 설계

**작성일**: 2025-10-09
**버전**: 1.0
**상태**: 설계 단계

---

## 📋 목차

1. [비즈니스 요구사항](#비즈니스-요구사항)
2. [결제 플로우](#결제-플로우)
3. [환불 정책](#환불-정책)
4. [크레딧 & 보증금 시스템](#크레딧--보증금-시스템)
5. [동적 환불 정책 시스템](#동적-환불-정책-시스템) ⭐ NEW
6. [데이터베이스 스키마](#데이터베이스-스키마)
7. [정산 계산 로직](#정산-계산-로직)
8. [API 엔드포인트](#api-엔드포인트)
9. [Admin 환불 정책 관리 UI](#admin-환불-정책-관리-ui) ⭐ NEW
10. [토스페이먼츠 연동](#토스페이먼츠-연동)

---

## 📋 비즈니스 요구사항

### 결제 시점
- **예약 신청**: 결제 없음 (트레이너 승인 대기)
- **트레이너 승인**: 100% 즉시 결제 (예약 확정 시점)
- **결제 완료 후**: 고객 & 트레이너 모두 알림

### 정산 규칙
- **플랫폼 수수료**: 15%
- **트레이너 정산액**: 총 결제액의 85%
- **정산 대기 기간**: 서비스 완료 후 15일
- **보증금**: 200,000원 (필수 보유)
- **출금 가능 금액**: 크레딧 - 200,000원

### 취소 & 환불 정책
- **24시간 이전 취소**: 환불율에 따라 부분 환불
- **24시간 이내 취소**: 환불 없음 (전액 트레이너 정산)
- **트레이너 취소**: 100% 환불 + 트레이너 페널티 15%

---

## 🔄 결제 플로우

### 1️⃣ 예약 신청 (고객)
```
고객 → 예약 폼 작성
     → 예약 신청 완료
     → bookings.status = 'pending'
     → 💰 결제: ❌ 없음
     → 트레이너에게 "새 예약 신청" 알림
```

### 2️⃣ 예약 승인 (트레이너)
```
트레이너 → 예약 승인
        → bookings.status = 'confirmed'
        → bookings.confirmed_at = NOW()
        → bookings.cancellation_deadline = booking_date - 24시간
        → 💰 결제 즉시 진행
        → 토스페이먼츠 결제창 오픈
```

### 3️⃣ 결제 처리
```
토스 결제창 → 결제 수단 선택
           → 결제 완료
           → 웹훅 수신
           → payments 테이블 INSERT
           → payments.payment_status = 'paid'
           → 고객 & 트레이너 알림
```

### 4️⃣ 서비스 제공
```
서비스 제공일 → 트레이너 서비스 제공
             → 트레이너가 "완료" 버튼 클릭
             → bookings.status = 'completed'
             → bookings.completed_at = NOW()
             → settlements 테이블 INSERT
             → settlement_available_at = completed_at + 15일
```

### 5️⃣ 정산 처리
```
15일 후 → settlements.status = 'available'
       → 트레이너 "정산 가능" 알림
       → Admin 정산 승인
       → trainer_credits.available_credits += 정산액
       → credit_transactions INSERT
```

---

## 🔙 환불 정책

### 환불율 계산 로직

```typescript
// 취소 시점에 따른 환불율 (서비스 이용일 기준)
const getRefundRate = (cancelledAt: Date, bookingDate: Date): number => {
  const hoursUntilService =
    (bookingDate.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);

  if (hoursUntilService < 24) {
    return 0;      // 24시간 이내: 0% 환불 (전액 몰수)
  } else if (hoursUntilService < 48) {
    return 0.5;    // 24-48시간: 50% 환불
  } else if (hoursUntilService < 72) {
    return 0.7;    // 48-72시간: 70% 환불
  } else {
    return 0.9;    // 72시간 이상: 90% 환불
  }
};
```

### 취소 시나리오별 처리

#### Case A: 서비스 완료 (정상)
```
고객 결제: 100,000원
트레이너 정산: 85,000원 (15일 후)
플랫폼 수수료: 15,000원
```

#### Case B: 고객 취소 - 72시간 이상 전
```
고객 결제: 100,000원
고객 환불: 90,000원
트레이너 정산: 8,500원 (10,000 × 85%)
플랫폼 수수료: 1,500원 (10,000 × 15%)
```

#### Case C: 고객 취소 - 48-72시간 전
```
고객 결제: 100,000원
고객 환불: 70,000원
트레이너 정산: 25,500원 (30,000 × 85%)
플랫폼 수수료: 4,500원 (30,000 × 15%)
```

#### Case D: 고객 취소 - 24-48시간 전
```
고객 결제: 100,000원
고객 환불: 50,000원
트레이너 정산: 42,500원 (50,000 × 85%)
플랫폼 수수료: 7,500원 (50,000 × 15%)
```

#### Case E: 고객 취소 - 24시간 이내
```
고객 결제: 100,000원
고객 환불: 0원 (전액 몰수)
트레이너 정산: 85,000원 (100,000 × 85%)
플랫폼 수수료: 15,000원
```

#### Case F: 트레이너 취소 (언제든지)
```
고객 결제: 100,000원
고객 환불: 100,000원 (전액 환불)
트레이너 차감: -100,000원 (환불액)
트레이너 페널티: -15,000원 (15% 추가)
총 트레이너 차감: -115,000원
플랫폼 수수료: 0원
```

### 📊 환불 정책 요약표

| 상황 | 고객 환불 | 트레이너 정산 | 플랫폼 수수료 | 트레이너 페널티 |
|------|----------|-------------|-------------|---------------|
| 서비스 완료 | 0% | 85% | 15% | - |
| 고객 취소 (72h+) | 90% | 8.5% | 1.5% | - |
| 고객 취소 (48-72h) | 70% | 25.5% | 4.5% | - |
| 고객 취소 (24-48h) | 50% | 42.5% | 7.5% | - |
| 고객 취소 (24h 이내) | 0% | 85% | 15% | - |
| 트레이너 취소 | 100% | **-115%** | 0% | **+15%** |

---

## 💳 크레딧 & 보증금 시스템

### 핵심 개념
```
트레이너 크레딧 (available_credits)
└─> 정산 완료된 금액 (출금 가능한 총 금액)

보증금 (deposit_required)
└─> 200,000원 (필수 보유)

출금 가능 금액 (withdrawable_amount)
└─> available_credits - 200,000원
└─> 200,000원 이상일 때만 출금 가능
```

### 크레딧 흐름 예시

```
초기 상태
├─> 크레딧: 0원
└─> 출금 가능: 0원 (보증금 미달) ❌

서비스 완료 #1 (총 100,000원)
├─> 정산액: 85,000원 (15일 후)
├─> 크레딧: 85,000원
└─> 출금 가능: 0원 (보증금 미달) ❌

서비스 완료 #2 (총 100,000원)
├─> 정산액: 85,000원
├─> 크레딧: 170,000원
└─> 출금 가능: 0원 (보증금 미달) ❌

서비스 완료 #3 (총 100,000원)
├─> 정산액: 85,000원
├─> 크레딧: 255,000원
└─> 출금 가능: 55,000원 ✅
    (255,000 - 200,000)

트레이너 출금 신청 (50,000원)
├─> 출금 처리: 50,000원
├─> 크레딧: 205,000원
└─> 출금 가능: 5,000원

트레이너 취소 발생 (-115,000원)
├─> 페널티 차감: -115,000원
├─> 크레딧: 90,000원
├─> 보증금 부족 ⚠️
└─> 출금 불가 ❌
    └─> 경고: "보증금 미달, 추가 예약 제한 가능"
```

### 보증금 상태

```typescript
type DepositStatus =
  | 'sufficient'     // 보증금 충족 (>= 200,000원)
  | 'at_risk'        // 보증금 위험 (>= 100,000원, < 200,000원)
  | 'insufficient';  // 보증금 부족 (< 100,000원)
```

---

## 🎛️ 동적 환불 정책 시스템

### 개요

Admin이 대시보드에서 환불 정책을 실시간으로 조정할 수 있는 시스템입니다.

### 조정 가능한 항목

#### 1. 취소 시점별 환불율
- **장기 취소 기준 시간** (기본: 72시간)
- **장기 취소 환불율** (기본: 90%)
- **중기 취소 기준 시간** (기본: 48시간)
- **중기 취소 환불율** (기본: 70%)
- **단기 취소 기준 시간** (기본: 24시간)
- **단기 취소 환불율** (기본: 50%)
- **당일 취소 환불율** (기본: 0%)

#### 2. 플랫폼 설정
- **플랫폼 수수료율** (기본: 15%)
- **정산 대기 일수** (기본: 15일)

#### 3. 트레이너 설정
- **보증금 금액** (기본: 200,000원)
- **트레이너 취소 페널티율** (기본: 15%)
- **트레이너 취소 시 고객 환불율** (기본: 100%)

### 정책 버전 관리

```typescript
interface RefundPolicy {
  id: string;
  policy_name: string;
  is_active: boolean;

  // 환불율 설정
  refund_rate_72h_plus: number;      // 72시간 이상 전
  refund_rate_48_72h: number;        // 48-72시간 전
  refund_rate_24_48h: number;        // 24-48시간 전
  refund_rate_under_24h: number;     // 24시간 이내

  // 시간 경계 설정
  boundary_long_hours: number;       // 장기 취소 기준 (기본: 72)
  boundary_medium_hours: number;     // 중기 취소 기준 (기본: 48)
  boundary_short_hours: number;      // 단기 취소 기준 (기본: 24)

  // 트레이너 취소 설정
  trainer_cancellation_refund_rate: number;  // 고객 환불율
  trainer_penalty_rate: number;              // 페널티율

  // 플랫폼 설정
  platform_fee_rate: number;         // 수수료율
  settlement_waiting_days: number;   // 정산 대기 일수
  trainer_deposit_required: number;  // 보증금

  // 메타데이터
  description: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}
```

### 동적 계산 로직

```typescript
// 활성 정책 조회
const getActivePolicy = async () => {
  const { data } = await supabase
    .from('refund_policies')
    .select('*')
    .eq('is_active', true)
    .single();

  return data;
};

// 동적 환불율 계산
const calculateRefundRate = (
  cancelledAt: Date,
  bookingDate: Date,
  policy: RefundPolicy
): number => {
  const hoursUntilService =
    (bookingDate.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);

  if (hoursUntilService >= policy.boundary_long_hours) {
    return policy.refund_rate_72h_plus;
  } else if (hoursUntilService >= policy.boundary_medium_hours) {
    return policy.refund_rate_48_72h;
  } else if (hoursUntilService >= policy.boundary_short_hours) {
    return policy.refund_rate_24_48h;
  } else {
    return policy.refund_rate_under_24h;
  }
};

// 동적 정산 계산
const calculateWithPolicy = async (booking, payment) => {
  const policy = await getActivePolicy();
  const totalPrice = payment.amount;

  // 정책에 따른 계산...
  const platformFee = totalPrice * policy.platform_fee_rate;
  const trainerAmount = totalPrice * (1 - policy.platform_fee_rate);

  return { platformFee, trainerAmount, policy };
};
```

### 정책 변경 영향 범위

**즉시 적용**:
- 새로운 예약의 환불 계산
- 새로운 정산 계산
- 새로운 크레딧 계산

**기존 예약**:
- 이미 생성된 예약은 생성 당시의 정책 적용
- `payments` 테이블에 `applied_policy_id` 저장하여 추적

---

## 🗄️ 데이터베이스 스키마

### 1. bookings 테이블 수정

#### 추가 필드
```sql
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_deadline TIMESTAMPTZ;

COMMENT ON COLUMN bookings.confirmed_at IS '트레이너 승인 시각 (결제 시점)';
COMMENT ON COLUMN bookings.completed_at IS '서비스 완료 시각';
COMMENT ON COLUMN bookings.cancelled_at IS '취소 시각';
COMMENT ON COLUMN bookings.cancellation_deadline IS '무료 취소 마감 시각 (서비스 24시간 전)';
```

#### booking_status enum 업데이트
```sql
-- 'paid' 상태 추가 (기존 enum에 없을 경우)
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'cancelled_by_customer';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'cancelled_by_customer_late';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'cancelled_by_trainer';

-- 최종 상태 목록
-- 'pending'                    : 트레이너 승인 대기
-- 'confirmed'                  : 예약 확정 (결제 완료)
-- 'completed'                  : 서비스 완료
-- 'cancelled_by_customer'      : 고객 취소 (24시간 전)
-- 'cancelled_by_customer_late' : 고객 취소 (24시간 이내)
-- 'cancelled_by_trainer'       : 트레이너 취소
-- 'rejected'                   : 트레이너 거절 (승인 전)
```

#### 자동 계산 트리거
```sql
-- 예약 확정 시 취소 마감 시각 자동 계산
CREATE OR REPLACE FUNCTION set_cancellation_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND NEW.confirmed_at IS NOT NULL THEN
    -- 서비스 시작 24시간 전
    NEW.cancellation_deadline =
      (NEW.booking_date::timestamp + NEW.start_time::interval) - INTERVAL '24 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_cancellation_deadline
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION set_cancellation_deadline();
```

### 2. refund_policies 테이블 (신규) ⭐

Admin이 환불 정책을 동적으로 조정할 수 있는 설정 테이블입니다.

```sql
CREATE TABLE refund_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 정책 정보
  policy_name VARCHAR(100) NOT NULL DEFAULT 'default',
  is_active BOOLEAN DEFAULT true,

  -- 환불율 설정 (취소 시점별)
  refund_rate_72h_plus DECIMAL(3,2) DEFAULT 0.90 CHECK (refund_rate_72h_plus >= 0 AND refund_rate_72h_plus <= 1),
  -- 72시간 이상 전 취소: 90%

  refund_rate_48_72h DECIMAL(3,2) DEFAULT 0.70 CHECK (refund_rate_48_72h >= 0 AND refund_rate_48_72h <= 1),
  -- 48-72시간 전 취소: 70%

  refund_rate_24_48h DECIMAL(3,2) DEFAULT 0.50 CHECK (refund_rate_24_48h >= 0 AND refund_rate_24_48h <= 1),
  -- 24-48시간 전 취소: 50%

  refund_rate_under_24h DECIMAL(3,2) DEFAULT 0.00 CHECK (refund_rate_under_24h >= 0 AND refund_rate_under_24h <= 1),
  -- 24시간 이내 취소: 0%

  -- 시간 경계 설정 (시간 단위)
  boundary_long_hours INTEGER DEFAULT 72 CHECK (boundary_long_hours > 0),
  -- 장기 취소 기준 (기본: 72시간)

  boundary_medium_hours INTEGER DEFAULT 48 CHECK (boundary_medium_hours > 0),
  -- 중기 취소 기준 (기본: 48시간)

  boundary_short_hours INTEGER DEFAULT 24 CHECK (boundary_short_hours > 0),
  -- 단기 취소 기준 (기본: 24시간)

  -- 트레이너 취소 설정
  trainer_cancellation_refund_rate DECIMAL(3,2) DEFAULT 1.00 CHECK (trainer_cancellation_refund_rate >= 0 AND trainer_cancellation_refund_rate <= 1),
  -- 트레이너 취소 시 고객 환불율: 100%

  trainer_penalty_rate DECIMAL(3,2) DEFAULT 0.15 CHECK (trainer_penalty_rate >= 0 AND trainer_penalty_rate <= 1),
  -- 트레이너 페널티율: 15%

  -- 플랫폼 수수료 설정
  platform_fee_rate DECIMAL(5,4) DEFAULT 0.15 CHECK (platform_fee_rate >= 0 AND platform_fee_rate <= 1),
  -- 플랫폼 수수료: 15%

  -- 보증금 설정
  trainer_deposit_required DECIMAL(10,2) DEFAULT 200000 CHECK (trainer_deposit_required >= 0),
  -- 트레이너 보증금: 200,000원

  -- 정산 설정
  settlement_waiting_days INTEGER DEFAULT 15 CHECK (settlement_waiting_days >= 0),
  -- 정산 대기 일수: 15일

  -- 메타데이터
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_refund_policies_is_active ON refund_policies(is_active);

-- 항상 하나의 활성 정책만 존재하도록 제약
CREATE UNIQUE INDEX idx_refund_policies_active_unique
  ON refund_policies(is_active)
  WHERE is_active = true;

-- 시간 경계 논리적 제약 (long > medium > short)
ALTER TABLE refund_policies ADD CONSTRAINT check_boundary_order
  CHECK (boundary_long_hours > boundary_medium_hours AND boundary_medium_hours > boundary_short_hours);

-- 초기 정책 생성
INSERT INTO refund_policies (
  policy_name,
  is_active,
  description,
  created_by
) VALUES (
  'Default Policy',
  true,
  '기본 환불 정책 - 72h(90%), 48h(70%), 24h(50%), 당일(0%)',
  (SELECT id FROM profiles WHERE user_type = 'admin' LIMIT 1)
);

-- updated_at 자동 업데이트
CREATE TRIGGER update_refund_policies_updated_at
  BEFORE UPDATE ON refund_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책
ALTER TABLE refund_policies ENABLE ROW LEVEL SECURITY;

-- 모두 활성 정책 읽기 가능 (클라이언트에서 정책 확인)
CREATE POLICY "Anyone can view active policies"
  ON refund_policies FOR SELECT
  USING (is_active = true);

-- Admin만 수정 가능
CREATE POLICY "Admins can manage policies"
  ON refund_policies FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE user_type = 'admin'
    )
  );

COMMENT ON TABLE refund_policies IS '환불 정책 설정 테이블 - Admin이 동적으로 조정 가능';
COMMENT ON COLUMN refund_policies.is_active IS '활성 정책 여부 (한 번에 하나만 활성)';
COMMENT ON COLUMN refund_policies.boundary_long_hours IS '장기 취소 기준 시간 (이상)';
COMMENT ON COLUMN refund_policies.boundary_medium_hours IS '중기 취소 기준 시간';
COMMENT ON COLUMN refund_policies.boundary_short_hours IS '단기 취소 기준 시간';
```

### 3. payments 테이블 (신규)

```sql
CREATE TABLE payments (
  -- 기본 정보
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- 적용된 정책 (결제 당시의 정책 저장)
  applied_policy_id UUID REFERENCES refund_policies(id),

  -- 결제 금액
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'KRW',

  -- 결제 수단
  payment_method VARCHAR(50) NOT NULL,
  -- 'card', 'kakao_pay', 'naver_pay', 'toss_pay', 'bank_transfer'

  card_company VARCHAR(50),             -- '신한', '국민', '삼성' 등
  card_number_masked VARCHAR(20),       -- '1234-****-****-5678'

  -- 토스페이먼츠 정보
  toss_payment_key VARCHAR(200) UNIQUE,     -- 토스 결제 고유 키
  toss_order_id VARCHAR(200) NOT NULL UNIQUE, -- 주문 ID (우리가 생성)
  toss_transaction_key VARCHAR(200),        -- 거래 키

  -- 결제 상태
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- 'pending'         : 결제 대기
  -- 'paid'            : 결제 완료
  -- 'failed'          : 결제 실패
  -- 'cancelled'       : 결제 취소
  -- 'partial_refunded': 부분 환불
  -- 'refunded'        : 전액 환불

  -- 결제 시각
  requested_at TIMESTAMPTZ DEFAULT NOW(),   -- 결제 요청 시각
  paid_at TIMESTAMPTZ,                       -- 결제 완료 시각
  failed_at TIMESTAMPTZ,                     -- 결제 실패 시각
  cancelled_at TIMESTAMPTZ,                  -- 결제 취소 시각

  -- 환불 정보
  refund_amount DECIMAL(10,2) DEFAULT 0 CHECK (refund_amount >= 0),
  refund_reason TEXT,
  refund_policy VARCHAR(50), -- 'full', 'partial_90', 'partial_70', 'partial_50', 'none'
  refunded_at TIMESTAMPTZ,

  -- 메타데이터
  payment_metadata JSONB,  -- 토스 응답 전체 저장
  failure_code VARCHAR(50),
  failure_message TEXT,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_payment_status ON payments(payment_status);
CREATE INDEX idx_payments_toss_order_id ON payments(toss_order_id);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);

-- updated_at 자동 업데이트
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 고객: 본인 결제만 조회
CREATE POLICY "Customers can view their own payments"
  ON payments FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

-- 트레이너: 본인 예약의 결제 정보 조회 (정산용)
CREATE POLICY "Trainers can view payments for their bookings"
  ON payments FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE trainer_id IN (
        SELECT id FROM trainers WHERE profile_id = auth.uid()
      )
    )
  );

-- Admin: 모든 결제 조회 및 관리
CREATE POLICY "Admins can manage all payments"
  ON payments FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE user_type = 'admin'
    )
  );
```

### 3. settlements 테이블 (신규)

```sql
CREATE TABLE settlements (
  -- 기본 정보
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,

  -- 정산 금액 계산
  booking_amount DECIMAL(10,2) NOT NULL CHECK (booking_amount > 0),
  -- 예약 총액 (100%)

  platform_fee_rate DECIMAL(5,4) DEFAULT 0.15,
  -- 15% 수수료율

  platform_fee DECIMAL(10,2) NOT NULL,
  -- 수수료 금액 (booking_amount × 15%)

  settlement_amount DECIMAL(10,2) NOT NULL,
  -- 트레이너 정산액 (booking_amount × 85%)

  -- 정산 상태
  settlement_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- 'pending'    : 정산 대기 (서비스 완료 + 15일 미도달)
  -- 'available'  : 정산 가능 (15일 경과)
  -- 'processing' : 정산 처리 중
  -- 'completed'  : 정산 완료 (크레딧 적립 완료)
  -- 'failed'     : 정산 실패
  -- 'held'       : 정산 보류 (분쟁 등)

  -- 정산 일정
  service_completed_at TIMESTAMPTZ NOT NULL,     -- 서비스 완료 시각
  settlement_available_at TIMESTAMPTZ NOT NULL,  -- 정산 가능 시작일 (완료 + 15일)
  settlement_completed_at TIMESTAMPTZ,            -- 정산 완료 시각 (크레딧 적립)

  -- 정산 사유
  settlement_reason VARCHAR(50) NOT NULL,
  -- 'service_completed'   : 서비스 정상 완료
  -- 'customer_cancelled'  : 고객 취소 (부분 정산)
  -- 'trainer_penalty'     : 트레이너 취소 (페널티 차감)

  -- 메타데이터
  admin_notes TEXT,              -- Admin 메모

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_settlements_booking_id ON settlements(booking_id);
CREATE INDEX idx_settlements_trainer_id ON settlements(trainer_id);
CREATE INDEX idx_settlements_settlement_status ON settlements(settlement_status);
CREATE INDEX idx_settlements_available_at ON settlements(settlement_available_at);
CREATE INDEX idx_settlements_completed_at ON settlements(settlement_completed_at);

-- updated_at 자동 업데이트
CREATE TRIGGER update_settlements_updated_at
  BEFORE UPDATE ON settlements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- 트레이너: 본인 정산 내역만 조회
CREATE POLICY "Trainers can view their own settlements"
  ON settlements FOR SELECT
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE profile_id = auth.uid()
    )
  );

-- Admin: 모든 정산 관리
CREATE POLICY "Admins can manage all settlements"
  ON settlements FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE user_type = 'admin'
    )
  );
```

### 4. trainer_credits 테이블 (신규)

```sql
CREATE TABLE trainer_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL UNIQUE REFERENCES trainers(id) ON DELETE CASCADE,

  -- 크레딧 정보
  total_credits DECIMAL(10,2) DEFAULT 0 CHECK (total_credits >= 0),
  -- 총 적립 크레딧 (누적, 통계용)

  pending_credits DECIMAL(10,2) DEFAULT 0 CHECK (pending_credits >= 0),
  -- 정산 대기 크레딧 (15일 이내)

  available_credits DECIMAL(10,2) DEFAULT 0,
  -- 사용 가능 크레딧 (정산 완료, 출금 가능 여부는 deposit 확인)
  -- 음수 가능 (트레이너 취소 페널티로 인한 마이너스 잔고)

  -- 보증금
  deposit_required DECIMAL(10,2) DEFAULT 200000,
  -- 필수 보증금 (기본 20만원)

  deposit_status VARCHAR(20) DEFAULT 'insufficient',
  -- 'sufficient'   : 보증금 충족 (>= 200,000원)
  -- 'at_risk'      : 보증금 위험 (>= 100,000원, < 200,000원)
  -- 'insufficient' : 보증금 부족 (< 100,000원)

  -- 출금 관련
  total_withdrawn DECIMAL(10,2) DEFAULT 0 CHECK (total_withdrawn >= 0),
  -- 총 출금액

  withdrawable_amount DECIMAL(10,2) GENERATED ALWAYS AS (
    CASE
      WHEN available_credits > deposit_required
      THEN available_credits - deposit_required
      ELSE 0
    END
  ) STORED,
  -- 출금 가능 금액 (자동 계산)

  -- 페널티 추적
  total_penalties DECIMAL(10,2) DEFAULT 0 CHECK (total_penalties >= 0),
  -- 총 페널티 금액 (누적)

  penalty_count INTEGER DEFAULT 0,
  -- 페널티 횟수 (트레이너 취소 횟수)

  -- 통계
  total_earned DECIMAL(10,2) DEFAULT 0 CHECK (total_earned >= 0),
  -- 총 수익 (누적, 페널티 제외)

  completed_bookings_count INTEGER DEFAULT 0,
  -- 완료된 예약 수

  cancelled_bookings_count INTEGER DEFAULT 0,
  -- 트레이너가 취소한 예약 수

  -- 계정 상태
  account_status VARCHAR(20) DEFAULT 'active',
  -- 'active'    : 정상
  -- 'suspended' : 정지 (보증금 미달 등)
  -- 'blocked'   : 차단 (페널티 과다 등)

  suspension_reason TEXT,
  -- 계정 정지 사유

  -- 타임스탬프
  last_settlement_at TIMESTAMPTZ,
  last_withdrawal_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_trainer_credits_trainer_id ON trainer_credits(trainer_id);
CREATE INDEX idx_trainer_credits_deposit_status ON trainer_credits(deposit_status);
CREATE INDEX idx_trainer_credits_account_status ON trainer_credits(account_status);

-- 보증금 상태 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_deposit_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.available_credits >= NEW.deposit_required THEN
    NEW.deposit_status = 'sufficient';
  ELSIF NEW.available_credits >= (NEW.deposit_required * 0.5) THEN
    NEW.deposit_status = 'at_risk';  -- 보증금의 50% 이상
  ELSE
    NEW.deposit_status = 'insufficient';
  END IF;

  -- 보증금 미달 시 계정 상태 업데이트
  IF NEW.deposit_status = 'insufficient' AND NEW.account_status = 'active' THEN
    NEW.account_status = 'suspended';
    NEW.suspension_reason = '보증금 미달 (200,000원 필요)';
  ELSIF NEW.deposit_status = 'sufficient' AND NEW.account_status = 'suspended'
        AND NEW.suspension_reason LIKE '%보증금%' THEN
    NEW.account_status = 'active';
    NEW.suspension_reason = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_deposit_status
  BEFORE INSERT OR UPDATE OF available_credits ON trainer_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_deposit_status();

-- updated_at 자동 업데이트
CREATE TRIGGER update_trainer_credits_updated_at
  BEFORE UPDATE ON trainer_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책
ALTER TABLE trainer_credits ENABLE ROW LEVEL SECURITY;

-- 트레이너: 본인 크레딧만 조회
CREATE POLICY "Trainers can view their own credits"
  ON trainer_credits FOR SELECT
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE profile_id = auth.uid()
    )
  );

-- Admin: 모든 크레딧 관리
CREATE POLICY "Admins can manage all credits"
  ON trainer_credits FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE user_type = 'admin'
    )
  );
```

### 5. withdrawals 테이블 (신규)

```sql
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,

  -- 출금 금액
  withdrawal_amount DECIMAL(10,2) NOT NULL CHECK (withdrawal_amount > 0),

  -- 출금 전후 잔고
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,

  -- 출금 방법
  withdrawal_method VARCHAR(50) NOT NULL, -- 'bank_transfer', 'toss'
  bank_name VARCHAR(50),
  bank_account VARCHAR(50),
  account_holder VARCHAR(100),

  -- 출금 상태
  withdrawal_status VARCHAR(20) DEFAULT 'pending',
  -- 'pending'    : 출금 신청 대기
  -- 'approved'   : 승인 완료
  -- 'processing' : 처리 중
  -- 'completed'  : 출금 완료
  -- 'rejected'   : 거절
  -- 'failed'     : 실패

  -- 처리 정보
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  approved_by UUID REFERENCES profiles(id), -- Admin who approved
  rejection_reason TEXT,

  -- 거래 참조
  transaction_reference VARCHAR(200), -- 은행 거래 번호

  -- 메타데이터
  admin_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_withdrawals_trainer_id ON withdrawals(trainer_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(withdrawal_status);
CREATE INDEX idx_withdrawals_requested_at ON withdrawals(requested_at);

-- updated_at 자동 업데이트
CREATE TRIGGER update_withdrawals_updated_at
  BEFORE UPDATE ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their own withdrawals"
  ON withdrawals FOR SELECT
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can request withdrawals"
  ON withdrawals FOR INSERT
  WITH CHECK (
    trainer_id IN (
      SELECT id FROM trainers WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all withdrawals"
  ON withdrawals FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE user_type = 'admin'
    )
  );
```

### 6. credit_transactions 테이블 (신규)

```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,

  -- 거래 타입
  transaction_type VARCHAR(50) NOT NULL,
  -- 'settlement_add'      : 정산 적립
  -- 'penalty_deduct'      : 페널티 차감 (트레이너 취소)
  -- 'withdrawal_deduct'   : 출금 차감
  -- 'refund_add'          : 환불 적립 (고객 취소 시 일부 정산)
  -- 'adjustment_add'      : 수동 추가 (Admin)
  -- 'adjustment_deduct'   : 수동 차감 (Admin)

  -- 금액 (양수: 적립, 음수: 차감)
  amount DECIMAL(10,2) NOT NULL,

  -- 잔고
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,

  -- 관련 레코드
  booking_id UUID REFERENCES bookings(id),
  settlement_id UUID REFERENCES settlements(id),
  withdrawal_id UUID REFERENCES withdrawals(id),
  payment_id UUID REFERENCES payments(id),

  -- 설명
  description TEXT NOT NULL,
  admin_notes TEXT,

  -- 처리자
  processed_by UUID REFERENCES profiles(id), -- Admin or System

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_credit_transactions_trainer_id ON credit_transactions(trainer_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_booking_id ON credit_transactions(booking_id);

-- RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their own transactions"
  ON credit_transactions FOR SELECT
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all transactions"
  ON credit_transactions FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE user_type = 'admin'
    )
  );
```

---

## 🧮 정산 계산 로직

### TypeScript 정산 계산 함수

```typescript
// lib/payment/settlement.ts

interface SettlementCalculation {
  refundAmount: number;
  trainerAmount: number;
  platformFee: number;
  trainerPenalty: number;
  settlementReason: string;
}

/**
 * 예약 상태에 따른 정산 금액 계산
 */
export const calculateSettlement = (
  booking: Booking,
  payment: Payment
): SettlementCalculation => {
  const totalPrice = payment.amount;
  const platformFeeRate = 0.15;

  let refundAmount = 0;
  let trainerAmount = 0;
  let platformFee = 0;
  let trainerPenalty = 0;
  let settlementReason = '';

  switch (booking.status) {
    case 'completed':
      // 정상 완료: 트레이너 85%, 플랫폼 15%
      refundAmount = 0;
      trainerAmount = totalPrice * 0.85;
      platformFee = totalPrice * 0.15;
      settlementReason = 'service_completed';
      break;

    case 'cancelled_by_customer':
      // 고객 취소 (24시간 전): 환불율에 따라
      const refundRate = getRefundRate(
        booking.cancelled_at!,
        booking.booking_date
      );
      refundAmount = totalPrice * refundRate;
      const remainingAmount = totalPrice - refundAmount;
      trainerAmount = remainingAmount * 0.85;
      platformFee = remainingAmount * 0.15;
      settlementReason = 'customer_cancelled';
      break;

    case 'cancelled_by_customer_late':
      // 고객 취소 (24시간 이내): 전액 트레이너 정산
      refundAmount = 0;
      trainerAmount = totalPrice * 0.85;
      platformFee = totalPrice * 0.15;
      settlementReason = 'customer_cancelled';
      break;

    case 'cancelled_by_trainer':
      // 트레이너 취소: 고객 100% 환불 + 트레이너 페널티 15%
      refundAmount = totalPrice;
      trainerAmount = -(totalPrice * 1.15); // 음수 (차감)
      trainerPenalty = totalPrice * 0.15;
      platformFee = 0;
      settlementReason = 'trainer_penalty';
      break;

    default:
      throw new Error(`Unknown booking status: ${booking.status}`);
  }

  return {
    refundAmount,
    trainerAmount,
    platformFee,
    trainerPenalty,
    settlementReason
  };
};

/**
 * 취소 시점에 따른 환불율 계산
 */
const getRefundRate = (cancelledAt: Date, bookingDate: Date): number => {
  const hoursUntilService =
    (bookingDate.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);

  if (hoursUntilService < 24) {
    return 0;      // 24시간 이내: 0% 환불
  } else if (hoursUntilService < 48) {
    return 0.5;    // 24-48시간: 50% 환불
  } else if (hoursUntilService < 72) {
    return 0.7;    // 48-72시간: 70% 환불
  } else {
    return 0.9;    // 72시간 이상: 90% 환불
  }
};
```

### 크레딧 관리 함수

```typescript
// lib/payment/credits.ts

/**
 * 트레이너 크레딧 추가
 */
export const addTrainerCredits = async (
  trainerId: string,
  amount: number,
  transactionType: string,
  bookingId?: string,
  description?: string
) => {
  const supabase = createServiceClient(); // Service Role

  // 현재 잔고 조회
  const { data: credits } = await supabase
    .from('trainer_credits')
    .select('available_credits')
    .eq('trainer_id', trainerId)
    .single();

  const balanceBefore = credits?.available_credits || 0;
  const balanceAfter = balanceBefore + amount;

  // 크레딧 업데이트
  await supabase
    .from('trainer_credits')
    .update({
      available_credits: balanceAfter,
      total_earned: amount > 0
        ? supabase.raw(`total_earned + ${amount}`)
        : undefined,
      total_penalties: amount < 0
        ? supabase.raw(`total_penalties + ${Math.abs(amount)}`)
        : undefined,
      updated_at: new Date().toISOString()
    })
    .eq('trainer_id', trainerId);

  // 거래 내역 기록
  await supabase
    .from('credit_transactions')
    .insert({
      trainer_id: trainerId,
      transaction_type: transactionType,
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      booking_id: bookingId,
      description: description || `${transactionType} 처리`
    });
};

/**
 * 출금 가능 여부 확인
 */
export const canWithdraw = async (
  trainerId: string,
  amount: number
): Promise<{ canWithdraw: boolean; reason?: string }> => {
  const supabase = createServiceClient();

  const { data: credits } = await supabase
    .from('trainer_credits')
    .select('withdrawable_amount, account_status, deposit_status')
    .eq('trainer_id', trainerId)
    .single();

  if (!credits) {
    return { canWithdraw: false, reason: '크레딧 정보를 찾을 수 없습니다.' };
  }

  if (credits.account_status !== 'active') {
    return { canWithdraw: false, reason: '계정이 정지 상태입니다.' };
  }

  if (credits.deposit_status !== 'sufficient') {
    return { canWithdraw: false, reason: '보증금이 부족합니다. (200,000원 필요)' };
  }

  if (credits.withdrawable_amount < amount) {
    return {
      canWithdraw: false,
      reason: `출금 가능 금액이 부족합니다. (가능: ${credits.withdrawable_amount}원)`
    };
  }

  return { canWithdraw: true };
};
```

---

## 🔌 API 엔드포인트

### 결제 API

#### POST /api/payment/initiate
```typescript
// 결제 시작 (트레이너 승인 후)
Request:
{
  "bookingId": "uuid",
  "amount": 100000,
  "successUrl": "/payment/success",
  "failUrl": "/payment/fail"
}

Response:
{
  "orderId": "ORDER-{bookingId}",
  "amount": 100000,
  "checkoutUrl": "https://api.tosspayments.com/v1/payments/..."
}
```

#### POST /api/payment/success
```typescript
// 결제 성공 콜백
Request:
{
  "paymentKey": "toss_payment_key",
  "orderId": "ORDER-xxx",
  "amount": 100000
}

Response:
{
  "success": true,
  "paymentId": "uuid",
  "bookingId": "uuid"
}
```

#### POST /api/payment/refund
```typescript
// 환불 처리
Request:
{
  "paymentId": "uuid",
  "refundAmount": 70000,
  "refundReason": "고객 취소"
}

Response:
{
  "success": true,
  "refundAmount": 70000,
  "refundedAt": "2025-10-09T12:00:00Z"
}
```

### 정산 API

#### POST /api/settlement/create
```typescript
// 정산 레코드 생성 (서비스 완료 시)
Request:
{
  "bookingId": "uuid"
}

Response:
{
  "settlementId": "uuid",
  "settlementAmount": 85000,
  "settlementAvailableAt": "2025-10-24T12:00:00Z"
}
```

#### POST /api/settlement/process
```typescript
// 정산 처리 (15일 후 크레딧 적립)
Request:
{
  "settlementId": "uuid"
}

Response:
{
  "success": true,
  "creditAdded": 85000,
  "newBalance": 255000
}
```

### 크레딧 & 출금 API

#### GET /api/trainer/credits
```typescript
// 트레이너 크레딧 조회
Response:
{
  "availableCredits": 255000,
  "pendingCredits": 85000,
  "withdrawableAmount": 55000,
  "depositRequired": 200000,
  "depositStatus": "sufficient",
  "accountStatus": "active"
}
```

#### POST /api/trainer/withdrawal
```typescript
// 출금 신청
Request:
{
  "amount": 50000,
  "withdrawalMethod": "bank_transfer",
  "bankName": "신한은행",
  "bankAccount": "110-123-456789",
  "accountHolder": "홍길동"
}

Response:
{
  "withdrawalId": "uuid",
  "withdrawalStatus": "pending",
  "balanceAfter": 205000
}
```

#### GET /api/trainer/transactions
```typescript
// 크레딧 거래 내역 조회
Response:
{
  "transactions": [
    {
      "id": "uuid",
      "transactionType": "settlement_add",
      "amount": 85000,
      "balanceBefore": 170000,
      "balanceAfter": 255000,
      "description": "서비스 완료 정산",
      "createdAt": "2025-10-09T12:00:00Z"
    }
  ]
}
```

---

## 💳 토스페이먼츠 연동

### 1. 설치

```bash
npm install @tosspayments/payment-sdk
```

### 2. 환경 변수 설정

```env
# .env.local
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_xxxxxxxxxx
TOSS_SECRET_KEY=test_sk_xxxxxxxxxx
```

### 3. 결제 플로우 구현

#### 3-1. 결제 시작 (클라이언트)

```typescript
// app/(dashboard)/customer/bookings/[id]/payment/page.tsx
'use client';

import { loadTossPayments } from '@tosspayments/payment-sdk';

export default function PaymentPage({ params }: { params: { id: string } }) {
  const handlePayment = async () => {
    const tossPayments = await loadTossPayments(
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!
    );

    const response = await fetch('/api/payment/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: params.id,
        amount: booking.total_price,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`
      })
    });

    const { orderId, amount } = await response.json();

    await tossPayments.requestPayment('카드', {
      amount,
      orderId,
      orderName: `시니어케어 예약 #${params.id.slice(0, 8)}`,
      customerName: user.full_name,
      successUrl: `${window.location.origin}/payment/success`,
      failUrl: `${window.location.origin}/payment/fail`
    });
  };

  return (
    <button onClick={handlePayment}>
      결제하기 ({booking.total_price.toLocaleString()}원)
    </button>
  );
}
```

#### 3-2. 결제 승인 (서버)

```typescript
// app/api/payment/success/route.ts
import { createServiceClient } from '@/lib/supabase/service-client';

export async function POST(request: Request) {
  const { paymentKey, orderId, amount } = await request.json();

  // 토스페이먼츠 결제 승인 요청
  const response = await fetch(
    'https://api.tosspayments.com/v1/payments/confirm',
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(
          process.env.TOSS_SECRET_KEY + ':'
        ).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ paymentKey, orderId, amount })
    }
  );

  const payment = await response.json();

  if (!payment.status || payment.status !== 'DONE') {
    return Response.json({ error: '결제 실패' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const bookingId = orderId.replace('ORDER-', '');

  // payments 테이블에 저장
  const { data: paymentRecord } = await supabase
    .from('payments')
    .insert({
      booking_id: bookingId,
      customer_id: payment.customerId,
      amount: payment.totalAmount,
      payment_method: payment.method,
      toss_payment_key: paymentKey,
      toss_order_id: orderId,
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      payment_metadata: payment
    })
    .select()
    .single();

  // bookings 상태 업데이트
  await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId);

  return Response.json({ success: true, paymentId: paymentRecord.id });
}
```

#### 3-3. 환불 처리

```typescript
// app/api/payment/refund/route.ts
export async function POST(request: Request) {
  const { paymentId, refundAmount, refundReason } = await request.json();

  const supabase = createServiceClient();

  // 결제 정보 조회
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (!payment) {
    return Response.json({ error: '결제 정보를 찾을 수 없습니다.' }, { status: 404 });
  }

  // 토스페이먼츠 환불 요청
  const response = await fetch(
    `https://api.tosspayments.com/v1/payments/${payment.toss_payment_key}/cancel`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(
          process.env.TOSS_SECRET_KEY + ':'
        ).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cancelReason: refundReason,
        cancelAmount: refundAmount
      })
    }
  );

  const refund = await response.json();

  if (!refund.cancels) {
    return Response.json({ error: '환불 실패' }, { status: 400 });
  }

  // payments 테이블 업데이트
  await supabase
    .from('payments')
    .update({
      refund_amount: refundAmount,
      refund_reason: refundReason,
      refunded_at: new Date().toISOString(),
      payment_status: refundAmount === payment.amount ? 'refunded' : 'partial_refunded',
      payment_metadata: refund
    })
    .eq('id', paymentId);

  return Response.json({ success: true, refundAmount });
}
```

---

## 📝 구현 체크리스트

### Phase 1: 데이터베이스 설정
- [ ] bookings 테이블 필드 추가 (confirmed_at, completed_at, cancelled_at, cancellation_deadline)
- [ ] booking_status enum 업데이트
- [ ] payments 테이블 생성
- [ ] settlements 테이블 생성
- [ ] trainer_credits 테이블 생성
- [ ] withdrawals 테이블 생성
- [ ] credit_transactions 테이블 생성
- [ ] RLS 정책 설정
- [ ] 트리거 함수 생성

### Phase 2: 토스페이먼츠 연동
- [ ] 토스페이먼츠 계정 생성
- [ ] API 키 발급 (테스트/운영)
- [ ] SDK 설치 및 설정
- [ ] 결제 시작 API 구현
- [ ] 결제 승인 API 구현
- [ ] 환불 API 구현
- [ ] 웹훅 처리 구현

### Phase 3: 결제 UI 개발
- [ ] 결제 페이지 (/bookings/[id]/payment)
- [ ] 결제 성공 페이지 (/payment/success)
- [ ] 결제 실패 페이지 (/payment/fail)
- [ ] 결제 내역 조회 (고객)
- [ ] 결제 내역 조회 (트레이너)

### Phase 4: 정산 시스템 개발
- [ ] 정산 계산 로직 구현
- [ ] 정산 레코드 자동 생성
- [ ] 정산 상태 자동 업데이트 (cron job)
- [ ] 크레딧 적립 로직
- [ ] 정산 내역 조회 (트레이너)

### Phase 5: 크레딧 & 출금 시스템
- [ ] 크레딧 대시보드 (트레이너)
- [ ] 출금 신청 폼
- [ ] 출금 승인 페이지 (Admin)
- [ ] 거래 내역 조회
- [ ] 보증금 상태 모니터링

### Phase 6: Admin 관리 페이지
- [ ] 결제 내역 관리
- [ ] 정산 관리 페이지
- [ ] 출금 승인 페이지
- [ ] 크레딧 수동 조정 기능
- [ ] 통계 대시보드 (수익, 정산 등)
- [ ] **환불 정책 관리 페이지** ⭐ NEW

---

## 🎨 Admin 환불 정책 관리 UI

### 페이지 경로
`/admin/settings/refund-policy`

### UI 컴포넌트 구조

```typescript
// app/(dashboard)/admin/settings/refund-policy/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RefundPolicy } from '@/types/payment';

export default function RefundPolicyPage() {
  const [policy, setPolicy] = useState<RefundPolicy | null>(null);
  const [saving, setSaving] = useState(false);
  const [simulationAmount, setSimulationAmount] = useState(100000);

  // 활성 정책 불러오기
  useEffect(() => {
    loadActivePolicy();
  }, []);

  const loadActivePolicy = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('refund_policies')
      .select('*')
      .eq('is_active', true)
      .single();

    if (data) setPolicy(data);
  };

  // 정책 저장
  const handleSave = async () => {
    if (!policy) return;

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('refund_policies')
      .update({
        ...policy,
        updated_at: new Date().toISOString(),
        updated_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', policy.id);

    if (!error) {
      alert('정책이 저장되었습니다.');
    }

    setSaving(false);
  };

  // 환불 시뮬레이션 계산
  const calculateRefundSimulation = (hours: number) => {
    if (!policy) return 0;

    if (hours >= policy.boundary_long_hours) {
      return simulationAmount * policy.refund_rate_72h_plus;
    } else if (hours >= policy.boundary_medium_hours) {
      return simulationAmount * policy.refund_rate_48_72h;
    } else if (hours >= policy.boundary_short_hours) {
      return simulationAmount * policy.refund_rate_24_48h;
    } else {
      return simulationAmount * policy.refund_rate_under_24h;
    }
  };

  if (!policy) return <div>Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">환불 정책 설정</h1>
          <p className="text-gray-600 mt-2">
            취소 시점별 환불율과 플랫폼 수수료를 조정할 수 있습니다
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {saving ? '저장 중...' : '정책 저장'}
        </button>
      </div>

      {/* 시뮬레이션 */}
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>💡</span> 환불 시뮬레이션
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">예약 금액</label>
          <input
            type="number"
            value={simulationAmount}
            onChange={(e) => setSimulationAmount(parseInt(e.target.value))}
            className="w-full p-3 border rounded-lg"
            step="10000"
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-gray-700 mb-3">취소 시점별 환불액</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600 mb-1">{policy.boundary_long_hours}시간+ 전</div>
              <div className="text-2xl font-bold text-green-600">
                {calculateRefundSimulation(policy.boundary_long_hours).toLocaleString()}원
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ({(policy.refund_rate_72h_plus * 100).toFixed(0)}% 환불)
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600 mb-1">
                {policy.boundary_medium_hours}-{policy.boundary_long_hours}h 전
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {calculateRefundSimulation(policy.boundary_medium_hours).toLocaleString()}원
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ({(policy.refund_rate_48_72h * 100).toFixed(0)}% 환불)
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600 mb-1">
                {policy.boundary_short_hours}-{policy.boundary_medium_hours}h 전
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {calculateRefundSimulation(policy.boundary_short_hours).toLocaleString()}원
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ({(policy.refund_rate_24_48h * 100).toFixed(0)}% 환불)
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600 mb-1">{policy.boundary_short_hours}h 이내</div>
              <div className="text-2xl font-bold text-red-600">
                {calculateRefundSimulation(0).toLocaleString()}원
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ({(policy.refund_rate_under_24h * 100).toFixed(0)}% 환불)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 환불율 설정 */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">취소 시점별 환불율</h2>

        <div className="space-y-6">
          {/* 장기 취소 */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                장기 취소 기준 (시간)
              </label>
              <input
                type="number"
                value={policy.boundary_long_hours}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    boundary_long_hours: parseInt(e.target.value)
                  })
                }
                className="w-full p-3 border rounded-lg"
                min="1"
              />
              <p className="text-sm text-gray-500 mt-1">
                {policy.boundary_long_hours}시간 이상 전 취소
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                환불율 (0.00 ~ 1.00)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={policy.refund_rate_72h_plus}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    refund_rate_72h_plus: parseFloat(e.target.value)
                  })
                }
                className="w-full p-3 border rounded-lg"
              />
              <p className="text-sm text-gray-500 mt-1">
                {(policy.refund_rate_72h_plus * 100).toFixed(0)}% 환불
              </p>
            </div>
          </div>

          {/* 중기 취소 */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                중기 취소 기준 (시간)
              </label>
              <input
                type="number"
                value={policy.boundary_medium_hours}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    boundary_medium_hours: parseInt(e.target.value)
                  })
                }
                className="w-full p-3 border rounded-lg"
                min="1"
              />
              <p className="text-sm text-gray-500 mt-1">
                {policy.boundary_medium_hours}-{policy.boundary_long_hours}시간 전 취소
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                환불율 (0.00 ~ 1.00)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={policy.refund_rate_48_72h}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    refund_rate_48_72h: parseFloat(e.target.value)
                  })
                }
                className="w-full p-3 border rounded-lg"
              />
              <p className="text-sm text-gray-500 mt-1">
                {(policy.refund_rate_48_72h * 100).toFixed(0)}% 환불
              </p>
            </div>
          </div>

          {/* 단기 취소 */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                단기 취소 기준 (시간)
              </label>
              <input
                type="number"
                value={policy.boundary_short_hours}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    boundary_short_hours: parseInt(e.target.value)
                  })
                }
                className="w-full p-3 border rounded-lg"
                min="1"
              />
              <p className="text-sm text-gray-500 mt-1">
                {policy.boundary_short_hours}-{policy.boundary_medium_hours}시간 전 취소
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                환불율 (0.00 ~ 1.00)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={policy.refund_rate_24_48h}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    refund_rate_24_48h: parseFloat(e.target.value)
                  })
                }
                className="w-full p-3 border rounded-lg"
              />
              <p className="text-sm text-gray-500 mt-1">
                {(policy.refund_rate_24_48h * 100).toFixed(0)}% 환불
              </p>
            </div>
          </div>

          {/* 당일 취소 */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                당일 취소 (고정)
              </label>
              <div className="p-3 bg-gray-50 border rounded-lg text-gray-700">
                {policy.boundary_short_hours}시간 이내 취소
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                환불율 (0.00 ~ 1.00)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={policy.refund_rate_under_24h}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    refund_rate_under_24h: parseFloat(e.target.value)
                  })
                }
                className="w-full p-3 border rounded-lg"
              />
              <p className="text-sm text-gray-500 mt-1">
                {(policy.refund_rate_under_24h * 100).toFixed(0)}% 환불
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 플랫폼 설정 */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">플랫폼 설정</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              플랫폼 수수료율 (0.00 ~ 1.00)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={policy.platform_fee_rate}
              onChange={(e) =>
                setPolicy({
                  ...policy,
                  platform_fee_rate: parseFloat(e.target.value)
                })
              }
              className="w-full p-3 border rounded-lg"
            />
            <p className="text-sm text-gray-500 mt-1">
              트레이너 정산: {((1 - policy.platform_fee_rate) * 100).toFixed(1)}%
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              정산 대기 기간 (일)
            </label>
            <input
              type="number"
              value={policy.settlement_waiting_days}
              onChange={(e) =>
                setPolicy({
                  ...policy,
                  settlement_waiting_days: parseInt(e.target.value)
                })
              }
              className="w-full p-3 border rounded-lg"
              min="0"
            />
            <p className="text-sm text-gray-500 mt-1">
              서비스 완료 후 {policy.settlement_waiting_days}일 후 정산 가능
            </p>
          </div>
        </div>
      </section>

      {/* 트레이너 설정 */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">트레이너 설정</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              보증금 (원)
            </label>
            <input
              type="number"
              step="10000"
              value={policy.trainer_deposit_required}
              onChange={(e) =>
                setPolicy({
                  ...policy,
                  trainer_deposit_required: parseFloat(e.target.value)
                })
              }
              className="w-full p-3 border rounded-lg"
              min="0"
            />
            <p className="text-sm text-gray-500 mt-1">
              {policy.trainer_deposit_required.toLocaleString()}원
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              트레이너 취소 페널티율 (0.00 ~ 1.00)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={policy.trainer_penalty_rate}
              onChange={(e) =>
                setPolicy({
                  ...policy,
                  trainer_penalty_rate: parseFloat(e.target.value)
                })
              }
              className="w-full p-3 border rounded-lg"
            />
            <p className="text-sm text-gray-500 mt-1">
              트레이너 취소 시 {(policy.trainer_penalty_rate * 100).toFixed(0)}% 페널티
            </p>
          </div>
        </div>
      </section>

      {/* 정책 설명 */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">정책 설명 (선택)</h2>

        <textarea
          value={policy.description || ''}
          onChange={(e) =>
            setPolicy({
              ...policy,
              description: e.target.value
            })
          }
          className="w-full p-3 border rounded-lg"
          rows={3}
          placeholder="정책 변경 사유나 설명을 입력하세요..."
        />
      </section>

      {/* 저장 버튼 (하단) */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-lg"
        >
          {saving ? '저장 중...' : '정책 저장'}
        </button>
      </div>
    </div>
  );
}
```

### 주요 기능

1. **실시간 시뮬레이션**
   - 입력한 금액에 대한 취소 시점별 환불액 자동 계산
   - 4가지 시나리오 즉시 표시

2. **직관적인 입력**
   - 시간 경계 조정 (24h, 48h, 72h)
   - 환불율 조정 (0% ~ 100%)
   - 실시간 미리보기

3. **검증**
   - 시간 경계 논리적 순서 검증 (72h > 48h > 24h)
   - 환불율 범위 검증 (0.00 ~ 1.00)
   - 보증금 최소값 검증

4. **변경 이력**
   - `updated_by` 필드에 Admin ID 저장
   - `updated_at` 자동 기록
   - `description` 필드에 변경 사유 기록

---

### Phase 7: 테스트
- [ ] 결제 플로우 테스트
- [ ] 환불 처리 테스트
- [ ] 정산 계산 정확도 테스트
- [ ] 크레딧 잔고 테스트
- [ ] 보증금 검증 테스트
- [ ] Edge case 테스트
- [ ] **환불 정책 변경 테스트** ⭐ NEW
- [ ] **동적 환불율 계산 테스트** ⭐ NEW

---

**최종 업데이트**: 2025-10-09
**버전**: 1.1
**변경사항**:
- 동적 환불 정책 시스템 추가
- refund_policies 테이블 설계
- Admin 환불 정책 관리 UI 추가
- payments 테이블에 applied_policy_id 필드 추가

**다음 단계**: 마이그레이션 파일 생성 및 토스페이먼츠 계정 설정
