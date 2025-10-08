# Toss Payments 연동 가이드

## 📋 목차
1. [개요](#개요)
2. [사전 준비](#사전-준비)
3. [아키텍처 설계](#아키텍처-설계)
4. [Step 1: 환경 설정](#step-1-환경-설정)
5. [Step 2: 백엔드 API 구현](#step-2-백엔드-api-구현)
6. [Step 3: 프론트엔드 구현](#step-3-프론트엔드-구현)
7. [Step 4: Webhook 처리](#step-4-webhook-처리)
8. [테스트 시나리오](#테스트-시나리오)
9. [프로덕션 배포](#프로덕션-배포)
10. [트러블슈팅](#트러블슈팅)

---

## 개요

### 왜 Toss Payments인가?

**장점**:
- ✅ 한국 시장에 최적화 (카카오페이, 네이버페이, 토스페이 등)
- ✅ 개발자 친화적 API 및 문서
- ✅ 빠른 정산 주기
- ✅ 합리적인 수수료 (2.9% + VAT)
- ✅ 간편한 테스트 환경

**대안들**:
| 서비스 | 장점 | 단점 |
|--------|------|------|
| **Toss Payments** | 개발 편의성, 한국 최적화 | 글로벌 지원 제한 |
| **Iamport** | 다양한 PG사 통합 | 복잡한 설정 |
| **Stripe** | 글로벌 지원 | 한국 결제 수단 제한 |
| **NicePay** | 전통적 안정성 | 구식 API |

### 결제 플로우 개요

```
고객 → 예약 생성 → 결제 페이지
                      ↓
              Toss Payment Widget
                      ↓
         결제 정보 입력 (카드/간편결제)
                      ↓
              Toss 서버로 전송
                      ↓
              승인 요청 (서버)
                      ↓
         ✅ 성공 → DB 저장 → 예약 확정
         ❌ 실패 → 실패 페이지 → 재시도
```

---

## 사전 준비

### 1. Toss Payments 계정

**개발/테스트 계정** (무료):
1. https://developers.tosspayments.com/ 접속
2. 회원가입 (이메일만 있으면 됨)
3. 테스트 API 키 발급 (즉시 사용 가능)

**프로덕션 계정** (실제 서비스):
1. https://www.tosspayments.com/ 접속
2. 사업자 등록증 필요
3. 심사 후 승인 (1-3 영업일)
4. 실제 API 키 발급

### 2. API 키 종류

| 키 이름 | 용도 | 위치 | 노출 가능 |
|---------|------|------|----------|
| **Client Key** | 프론트엔드 위젯 | 브라우저 | ✅ 공개 가능 |
| **Secret Key** | 서버 API 호출 | 백엔드만 | ❌ 절대 비밀 |

### 3. 필요한 기술 스택

```json
{
  "frontend": [
    "@tosspayments/payment-widget-sdk",
    "react",
    "typescript"
  ],
  "backend": [
    "next.js (API Routes)",
    "@supabase/supabase-js",
    "node-fetch or axios"
  ],
  "database": [
    "PostgreSQL (Supabase)",
    "payments table",
    "bookings table"
  ]
}
```

---

## 아키텍처 설계

### 전체 시스템 구조

```
┌─────────────┐
│   Browser   │
│  (Customer) │
└──────┬──────┘
       │ 1. 결제 페이지 접속
       ↓
┌──────────────────────────────┐
│  Next.js Frontend            │
│  - TossPaymentWidget.tsx     │
│  - /bookings/[id]/payment    │
└──────┬───────────────────────┘
       │ 2. 결제 정보 입력
       ↓
┌──────────────────────────────┐
│  Toss Payments Server        │
│  (외부 서비스)                │
└──────┬───────────────────────┘
       │ 3. 결제 처리 완료
       ↓
┌──────────────────────────────┐
│  Next.js API Routes          │
│  - POST /api/payments/confirm│
│  - DB 업데이트               │
└──────┬───────────────────────┘
       │ 4. 예약 상태 업데이트
       ↓
┌──────────────────────────────┐
│  Supabase Database           │
│  - payments table            │
│  - bookings table            │
└──────────────────────────────┘
```

### 데이터 흐름

```typescript
// 1. 결제 요청 생성 (서버)
POST /api/payments/request
{
  bookingId: "uuid",
  amount: 100000,
  customerName: "홍길동"
}
→ DB에 payment 레코드 생성 (status: 'pending')
→ Toss orderId 반환

// 2. 결제 위젯 렌더링 (클라이언트)
TossPaymentWidget({
  clientKey: NEXT_PUBLIC_TOSS_CLIENT_KEY,
  orderId: "order_xxx",
  amount: 100000
})
→ 고객이 카드 정보 입력
→ Toss 서버로 전송

// 3. 결제 승인 (서버)
POST /api/payments/confirm
{
  paymentKey: "toss_payment_key",
  orderId: "order_xxx",
  amount: 100000
}
→ Toss API 호출: POST https://api.tosspayments.com/v1/payments/confirm
→ 성공 시 DB 업데이트 (status: 'paid', toss_payment_key)
→ booking 상태 업데이트 (status: 'confirmed')

// 4. Webhook 수신 (선택사항)
POST /api/webhooks/toss
{
  eventType: "PAYMENT_STATUS_CHANGED",
  data: { ... }
}
→ 결제 상태 동기화
```

---

## Step 1: 환경 설정

### 1.1 패키지 설치

```bash
# 프론트엔드 SDK
npm install @tosspayments/payment-widget-sdk

# 백엔드 (Next.js에 이미 포함)
# - fetch API (built-in)
# - Next.js API Routes (built-in)
```

### 1.2 환경변수 설정

**`.env.local`** 파일에 추가:

```bash
# Toss Payments API Keys (테스트)
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_xxxxxxxxxxxxxxxxx
TOSS_SECRET_KEY=test_sk_xxxxxxxxxxxxxxxxx

# Toss Payments API Keys (프로덕션)
# NEXT_PUBLIC_TOSS_CLIENT_KEY=live_ck_xxxxxxxxxxxxxxxxx
# TOSS_SECRET_KEY=live_sk_xxxxxxxxxxxxxxxxx

# Toss API Base URL
TOSS_API_BASE_URL=https://api.tosspayments.com
```

**⚠️ 보안 중요**:
- `NEXT_PUBLIC_*` → 브라우저에 노출됨 (Client Key만)
- `TOSS_SECRET_KEY` → 서버에서만 사용 (절대 프론트엔드에서 사용 금지)

### 1.3 TypeScript 타입 정의

**`lib/types/toss.ts`** 생성:

```typescript
// Toss Payments API 요청/응답 타입

export interface TossPaymentRequest {
  orderId: string;
  amount: number;
  orderName: string;
  customerName: string;
  customerEmail?: string;
  customerMobilePhone?: string;
}

export interface TossPaymentConfirm {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface TossPaymentResponse {
  version: string;
  paymentKey: string;
  type: 'NORMAL' | 'BILLING' | 'BRANDPAY';
  orderId: string;
  orderName: string;
  mId: string;
  currency: string;
  method: 'CARD' | 'VIRTUAL_ACCOUNT' | 'TRANSFER' | 'MOBILE_PHONE' | 'CULTURE_GIFT_CERTIFICATE' | 'FOREIGN_EASY_PAY';
  totalAmount: number;
  balanceAmount: number;
  status: 'READY' | 'IN_PROGRESS' | 'WAITING_FOR_DEPOSIT' | 'DONE' | 'CANCELED' | 'PARTIAL_CANCELED' | 'ABORTED' | 'EXPIRED';
  requestedAt: string;
  approvedAt: string;
  useEscrow: boolean;
  lastTransactionKey: string | null;
  suppliedAmount: number;
  vat: number;
  cultureExpense: boolean;
  taxFreeAmount: number;
  taxExemptionAmount: number;
  cancels: TossPaymentCancel[] | null;
  isPartialCancelable: boolean;
  card?: TossPaymentCard;
  virtualAccount?: TossPaymentVirtualAccount;
  transfer?: TossPaymentTransfer;
  mobilePhone?: TossPaymentMobilePhone;
  giftCertificate?: TossPaymentGiftCertificate;
  receipt: {
    url: string;
  };
  checkout: {
    url: string;
  };
  easyPay?: TossPaymentEasyPay;
  country: string;
  failure?: TossPaymentFailure;
  cashReceipt: TossPaymentCashReceipt | null;
  cashReceipts: TossPaymentCashReceipt[] | null;
  discount: TossPaymentDiscount | null;
}

export interface TossPaymentCard {
  amount: number;
  issuerCode: string;
  acquirerCode?: string;
  number: string;
  installmentPlanMonths: number;
  approveNo: string;
  useCardPoint: boolean;
  cardType: 'CREDIT' | 'CHECK' | 'GIFT';
  ownerType: 'PERSONAL' | 'CORPORATE';
  acquireStatus: 'READY' | 'REQUESTED' | 'COMPLETED' | 'CANCEL_REQUESTED' | 'CANCELED';
  isInterestFree: boolean;
  interestPayer: 'BUYER' | 'CARD_COMPANY' | 'MERCHANT' | null;
}

export interface TossPaymentCancel {
  cancelAmount: number;
  cancelReason: string;
  taxFreeAmount: number;
  taxExemptionAmount: number;
  refundableAmount: number;
  easyPayDiscountAmount: number;
  canceledAt: string;
  transactionKey: string;
  receiptKey: string | null;
}

export interface TossPaymentVirtualAccount {
  accountType: 'NORMAL' | 'FIXED';
  accountNumber: string;
  bankCode: string;
  customerName: string;
  dueDate: string;
  refundStatus: 'NONE' | 'PENDING' | 'FAILED' | 'COMPLETED';
  expired: boolean;
  settlementStatus: 'INCOMPLETE' | 'COMPLETE';
  refundReceiveAccount: {
    bankCode: string;
    accountNumber: string;
    holderName: string;
  } | null;
}

export interface TossPaymentTransfer {
  bankCode: string;
  settlementStatus: 'INCOMPLETE' | 'COMPLETE';
}

export interface TossPaymentMobilePhone {
  customerMobilePhone: string;
  settlementStatus: 'INCOMPLETE' | 'COMPLETE';
  receiptUrl: string;
}

export interface TossPaymentGiftCertificate {
  approveNo: string;
  settlementStatus: 'INCOMPLETE' | 'COMPLETE';
}

export interface TossPaymentEasyPay {
  provider: string;
  amount: number;
  discountAmount: number;
}

export interface TossPaymentFailure {
  code: string;
  message: string;
}

export interface TossPaymentCashReceipt {
  type: 'INCOME_DEDUCTION' | 'PROOF_OF_EXPENDITURE';
  receiptKey: string;
  issueNumber: string;
  receiptUrl: string;
  amount: number;
  taxFreeAmount: number;
}

export interface TossPaymentDiscount {
  amount: number;
}

// 에러 응답
export interface TossPaymentError {
  code: string;
  message: string;
}
```

---

## Step 2: 백엔드 API 구현

### 2.1 결제 요청 API

**`app/api/payments/request/route.ts`**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. 요청 데이터 파싱
    const { bookingId, amount, orderName, customerName } = await request.json();

    // 3. Booking 존재 및 권한 확인
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers!inner(id, profile_id)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // 4. 권한 확인 (본인 예약만)
    if (booking.customer.profile_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 5. 이미 결제된 예약인지 확인
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .in('payment_status', ['paid', 'pending'])
      .single();

    if (existingPayment) {
      return NextResponse.json(
        { error: 'Payment already exists for this booking' },
        { status: 400 }
      );
    }

    // 6. Toss Order ID 생성
    const tossOrderId = `order_${bookingId}_${Date.now()}`;

    // 7. Payment 레코드 생성
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        customer_id: booking.customer.id,
        toss_order_id: tossOrderId,
        amount: amount,
        currency: 'KRW',
        payment_method: 'pending', // 결제 수단은 나중에 업데이트
        payment_status: 'pending',
        payment_metadata: {
          orderName,
          customerName,
          requestedAt: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment insert error:', paymentError);
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      );
    }

    // 8. 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        orderId: tossOrderId,
        amount: amount,
        orderName,
        customerName
      }
    });

  } catch (error) {
    console.error('Payment request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2.2 결제 승인 API

**`app/api/payments/confirm/route.ts`**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TossPaymentConfirm, TossPaymentResponse, TossPaymentError } from '@/lib/types/toss';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. 요청 데이터 파싱
    const { paymentKey, orderId, amount }: TossPaymentConfirm = await request.json();

    // 3. DB에서 Payment 조회
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        booking:bookings!inner(*),
        customer:customers!inner(profile_id)
      `)
      .eq('toss_order_id', orderId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // 4. 권한 확인
    if (payment.customer.profile_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 5. 금액 일치 확인
    if (payment.amount !== amount) {
      return NextResponse.json(
        { error: 'Amount mismatch' },
        { status: 400 }
      );
    }

    // 6. Toss Payments API 호출 - 결제 승인
    const tossSecretKey = process.env.TOSS_SECRET_KEY;
    if (!tossSecretKey) {
      throw new Error('TOSS_SECRET_KEY is not defined');
    }

    const tossResponse = await fetch(
      'https://api.tosspayments.com/v1/payments/confirm',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(tossSecretKey + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount,
        }),
      }
    );

    const tossData: TossPaymentResponse | TossPaymentError = await tossResponse.json();

    // 7. Toss API 에러 처리
    if (!tossResponse.ok) {
      const error = tossData as TossPaymentError;

      // DB 업데이트 - 실패 기록
      await supabase
        .from('payments')
        .update({
          payment_status: 'failed',
          failed_at: new Date().toISOString(),
          failure_code: error.code,
          failure_message: error.message,
        })
        .eq('id', payment.id);

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: tossResponse.status }
      );
    }

    const tossPayment = tossData as TossPaymentResponse;

    // 8. DB 업데이트 - 결제 성공
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        toss_payment_key: tossPayment.paymentKey,
        payment_status: 'paid',
        payment_method: tossPayment.method,
        paid_at: tossPayment.approvedAt,
        card_company: tossPayment.card?.issuerCode || null,
        card_number_masked: tossPayment.card?.number || null,
        payment_metadata: {
          ...payment.payment_metadata,
          tossResponse: tossPayment,
        },
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Payment update error:', updateError);
      // Toss에서는 승인됐지만 DB 업데이트 실패 - 중요한 에러
      // 관리자에게 알림 필요
      return NextResponse.json(
        { error: 'Payment approved but database update failed' },
        { status: 500 }
      );
    }

    // 9. Booking 상태 업데이트 - 결제 완료 → 예약 확정
    await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', payment.booking_id);

    // 10. 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        paymentKey: tossPayment.paymentKey,
        orderId: tossPayment.orderId,
        amount: tossPayment.totalAmount,
        status: tossPayment.status,
        approvedAt: tossPayment.approvedAt,
        method: tossPayment.method,
        receipt: tossPayment.receipt,
      }
    });

  } catch (error) {
    console.error('Payment confirm error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2.3 결제 취소 API

**`app/api/payments/[paymentId]/cancel/route.ts`**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const supabase = createClient();

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. 요청 데이터 파싱
    const { cancelReason } = await request.json();

    // 3. Payment 조회
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        booking:bookings!inner(*),
        customer:customers!inner(profile_id)
      `)
      .eq('id', params.paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // 4. 권한 확인 (본인 or Admin)
    const isOwner = payment.customer.profile_id === user.id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();
    const isAdmin = profile?.user_type === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 5. 취소 가능 상태 확인
    if (payment.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment is not in paid status' },
        { status: 400 }
      );
    }

    // 6. Toss Payments API 호출 - 결제 취소
    const tossSecretKey = process.env.TOSS_SECRET_KEY;
    if (!tossSecretKey) {
      throw new Error('TOSS_SECRET_KEY is not defined');
    }

    const tossResponse = await fetch(
      `https://api.tosspayments.com/v1/payments/${payment.toss_payment_key}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(tossSecretKey + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancelReason: cancelReason || '고객 요청',
        }),
      }
    );

    const tossData = await tossResponse.json();

    if (!tossResponse.ok) {
      return NextResponse.json(
        { error: tossData.message, code: tossData.code },
        { status: tossResponse.status }
      );
    }

    // 7. DB 업데이트 - 취소 완료
    await supabase
      .from('payments')
      .update({
        payment_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        refund_reason: cancelReason,
        refund_amount: payment.amount,
        refunded_at: new Date().toISOString(),
        payment_metadata: {
          ...payment.payment_metadata,
          cancelResponse: tossData,
        },
      })
      .eq('id', payment.id);

    // 8. Booking 상태 업데이트
    await supabase
      .from('bookings')
      .update({
        status: 'cancelled_by_customer',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', payment.booking_id);

    // 9. 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        cancelledAt: new Date().toISOString(),
        refundAmount: payment.amount,
      }
    });

  } catch (error) {
    console.error('Payment cancel error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Step 3: 프론트엔드 구현

### 3.1 결제 위젯 컴포넌트

**`components/TossPaymentWidget.tsx`**:

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { loadPaymentWidget, PaymentWidgetInstance } from '@tosspayments/payment-widget-sdk';

interface TossPaymentWidgetProps {
  orderId: string;
  orderName: string;
  customerName: string;
  amount: number;
  onSuccess: (paymentKey: string, orderId: string, amount: number) => void;
  onError: (error: any) => void;
}

export default function TossPaymentWidget({
  orderId,
  orderName,
  customerName,
  amount,
  onSuccess,
  onError,
}: TossPaymentWidgetProps) {
  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);
  const paymentMethodsWidgetRef = useRef<any>(null);

  useEffect(() => {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey) {
      console.error('NEXT_PUBLIC_TOSS_CLIENT_KEY is not defined');
      return;
    }

    (async () => {
      try {
        // 1. 결제 위젯 로드
        const paymentWidget = await loadPaymentWidget(clientKey, customerName);
        paymentWidgetRef.current = paymentWidget;

        // 2. 결제 수단 위젯 렌더링
        const paymentMethodsWidget = paymentWidget.renderPaymentMethods(
          '#payment-widget',
          { value: amount },
          { variantKey: 'DEFAULT' }
        );

        paymentMethodsWidgetRef.current = paymentMethodsWidget;

        // 3. 약관 동의 위젯 렌더링
        paymentWidget.renderAgreement('#agreement');

      } catch (error) {
        console.error('Payment widget load error:', error);
        onError(error);
      }
    })();
  }, [orderId, customerName, amount, onError]);

  // 결제 요청
  const handlePayment = async () => {
    const paymentWidget = paymentWidgetRef.current;
    if (!paymentWidget) return;

    try {
      await paymentWidget.requestPayment({
        orderId,
        orderName,
        successUrl: `${window.location.origin}/payments/success`,
        failUrl: `${window.location.origin}/payments/fail`,
        customerName,
      });
    } catch (error) {
      console.error('Payment request error:', error);
      onError(error);
    }
  };

  return (
    <div className="payment-widget-container">
      {/* 결제 수단 선택 위젯 */}
      <div id="payment-widget" className="w-full" />

      {/* 약관 동의 위젯 */}
      <div id="agreement" className="w-full mt-4" />

      {/* 결제 버튼 */}
      <button
        onClick={handlePayment}
        className="w-full mt-6 bg-blue-500 text-white py-4 rounded-lg font-semibold hover:bg-blue-600 transition"
      >
        {amount.toLocaleString()}원 결제하기
      </button>
    </div>
  );
}
```

### 3.2 결제 페이지

**`app/bookings/[id]/payment/page.tsx`**:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import TossPaymentWidget from '@/components/TossPaymentWidget';

export default function PaymentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [booking, setBooking] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookingAndCreatePayment();
  }, [params.id]);

  const fetchBookingAndCreatePayment = async () => {
    try {
      // 1. Booking 조회
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          trainer:trainers(*),
          customer:customers(*)
        `)
        .eq('id', params.id)
        .single();

      if (bookingError) throw bookingError;
      setBooking(bookingData);

      // 2. 결제 요청 생성
      const response = await fetch('/api/payments/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: params.id,
          amount: bookingData.total_price,
          orderName: `${bookingData.trainer.full_name} 트레이닝 세션`,
          customerName: bookingData.customer.full_name,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setPaymentData(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentKey: string, orderId: string, amount: number) => {
    try {
      // 결제 승인 API 호출
      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      // 성공 페이지로 리다이렉트
      router.push(`/payments/success?paymentKey=${paymentKey}&orderId=${orderId}&amount=${amount}`);
    } catch (err: any) {
      alert(`결제 승인 실패: ${err.message}`);
    }
  };

  const handlePaymentError = (err: any) => {
    console.error('Payment error:', err);
    alert(`결제 오류: ${err.message || '알 수 없는 오류'}`);
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">로딩 중...</div>;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">오류: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">결제하기</h1>

      {/* 예약 정보 */}
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-4">예약 정보</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">트레이너</span>
            <span className="font-medium">{booking.trainer.full_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">날짜</span>
            <span className="font-medium">{booking.booking_date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">시간</span>
            <span className="font-medium">{booking.start_time} - {booking.end_time}</span>
          </div>
          <div className="flex justify-between text-lg font-bold mt-4 pt-4 border-t">
            <span>결제 금액</span>
            <span className="text-blue-600">{booking.total_price.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      {/* 결제 위젯 */}
      {paymentData && (
        <TossPaymentWidget
          orderId={paymentData.orderId}
          orderName={paymentData.orderName}
          customerName={paymentData.customerName}
          amount={paymentData.amount}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      )}
    </div>
  );
}
```

### 3.3 결제 성공 페이지

**`app/payments/success/page.tsx`**:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [confirming, setConfirming] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    confirmPayment();
  }, []);

  const confirmPayment = async () => {
    try {
      const paymentKey = searchParams.get('paymentKey');
      const orderId = searchParams.get('orderId');
      const amount = searchParams.get('amount');

      if (!paymentKey || !orderId || !amount) {
        throw new Error('Missing payment parameters');
      }

      // 결제 승인 API 호출
      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount: parseInt(amount),
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setConfirming(false);
    } catch (err: any) {
      setError(err.message);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-lg">결제 승인 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="text-red-500 text-xl mb-4">❌ 결제 승인 실패</div>
        <p className="text-gray-600 mb-8">{error}</p>
        <Link href="/bookings" className="bg-blue-500 text-white px-6 py-3 rounded-lg">
          예약 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen">
      <div className="text-green-500 text-6xl mb-4">✅</div>
      <h1 className="text-2xl font-bold mb-2">결제가 완료되었습니다!</h1>
      <p className="text-gray-600 mb-8">예약이 확정되었습니다.</p>
      <div className="space-x-4">
        <Link href="/bookings" className="bg-blue-500 text-white px-6 py-3 rounded-lg">
          예약 목록 보기
        </Link>
        <Link href="/" className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg">
          홈으로 가기
        </Link>
      </div>
    </div>
  );
}
```

### 3.4 결제 실패 페이지

**`app/payments/fail/page.tsx`**:

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PaymentFailPage() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('code');
  const errorMessage = searchParams.get('message');

  return (
    <div className="flex flex-col justify-center items-center min-h-screen">
      <div className="text-red-500 text-6xl mb-4">❌</div>
      <h1 className="text-2xl font-bold mb-2">결제에 실패했습니다</h1>
      <p className="text-gray-600 mb-2">오류 코드: {errorCode}</p>
      <p className="text-gray-600 mb-8">{errorMessage}</p>
      <div className="space-x-4">
        <button
          onClick={() => window.history.back()}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg"
        >
          다시 시도하기
        </button>
        <Link href="/" className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg">
          홈으로 가기
        </Link>
      </div>
    </div>
  );
}
```

---

## Step 4: Webhook 처리

### 4.1 Webhook Endpoint

**`app/api/webhooks/toss/route.ts`**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Webhook은 인증 없이 호출되므로 Service Role Key 사용
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('Toss Webhook received:', body);

    // Webhook 이벤트 타입별 처리
    switch (body.eventType) {
      case 'PAYMENT_STATUS_CHANGED':
        await handlePaymentStatusChanged(body.data);
        break;

      case 'VIRTUAL_ACCOUNT_ISSUED':
        await handleVirtualAccountIssued(body.data);
        break;

      case 'VIRTUAL_ACCOUNT_DEPOSIT':
        await handleVirtualAccountDeposit(body.data);
        break;

      default:
        console.log('Unknown webhook event type:', body.eventType);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentStatusChanged(data: any) {
  const { paymentKey, status, orderId } = data;

  // Payment 상태 동기화
  await supabase
    .from('payments')
    .update({
      payment_status: status.toLowerCase(),
      payment_metadata: data,
      updated_at: new Date().toISOString(),
    })
    .eq('toss_payment_key', paymentKey);
}

async function handleVirtualAccountIssued(data: any) {
  // 가상계좌 발급 처리
  console.log('Virtual account issued:', data);
}

async function handleVirtualAccountDeposit(data: any) {
  // 가상계좌 입금 처리
  console.log('Virtual account deposit:', data);
}
```

### 4.2 Webhook 설정 (Toss Dashboard)

1. Toss Payments 대시보드 로그인
2. 개발자센터 → Webhook 설정
3. Webhook URL 등록:
   ```
   https://yourdomain.com/api/webhooks/toss
   ```
4. 이벤트 선택:
   - ✅ 결제 상태 변경 (PAYMENT_STATUS_CHANGED)
   - ✅ 가상계좌 발급 (VIRTUAL_ACCOUNT_ISSUED)
   - ✅ 가상계좌 입금 (VIRTUAL_ACCOUNT_DEPOSIT)

---

## 테스트 시나리오

### 테스트 카드 번호 (Toss 제공)

| 카드사 | 카드번호 | 유효기간 | CVC |
|--------|----------|----------|-----|
| 국민카드 | 9490-0300-0000-0001 | 12/28 | 123 |
| 신한카드 | 9410-0300-0000-0002 | 12/28 | 123 |
| 비씨카드 | 9450-0300-0000-0003 | 12/28 | 123 |

### 테스트 플로우

```
1. 예약 생성
   → POST /api/bookings (고객)
   → bookingId 발급

2. 결제 페이지 접속
   → GET /bookings/[bookingId]/payment
   → POST /api/payments/request 자동 호출
   → orderId 발급

3. 결제 수단 선택 및 정보 입력
   → TossPaymentWidget 렌더링
   → 테스트 카드 정보 입력

4. 결제 요청
   → requestPayment() 호출
   → Toss 서버로 전송

5. 결제 승인
   → successUrl로 리다이렉트
   → POST /api/payments/confirm 호출
   → DB 업데이트 (payments, bookings)

6. 결제 완료
   → /payments/success 페이지 표시
```

---

## 프로덕션 배포

### 체크리스트

#### 1. 환경변수 (Production)
```bash
# Vercel 또는 서버 환경변수 설정
NEXT_PUBLIC_TOSS_CLIENT_KEY=live_ck_xxxxx
TOSS_SECRET_KEY=live_sk_xxxxx
```

#### 2. Toss Payments 계정
- ✅ 사업자 등록
- ✅ 계약 완료
- ✅ 정산 계좌 등록
- ✅ 실제 API 키 발급

#### 3. 보안 강화
- ✅ HTTPS 적용 (필수)
- ✅ CORS 설정
- ✅ Rate Limiting 설정
- ✅ IP Whitelist (Webhook)

#### 4. 모니터링
- ✅ 결제 실패 알림 (Slack, Email)
- ✅ 로그 수집 (Sentry, DataDog)
- ✅ 대시보드 구축

---

## 트러블슈팅

### 1. "Invalid credentials" 에러
**원인**: Secret Key가 잘못됨
**해결**:
```bash
# Secret Key 앞에 콜론(:) 추가해서 Base64 인코딩
Authorization: Basic {Base64(secretKey + ':')}
```

### 2. "Amount mismatch" 에러
**원인**: 클라이언트와 서버의 금액이 다름
**해결**:
- DB의 amount와 확인 요청의 amount 일치시키기
- 위젯 렌더링 시 금액 동기화

### 3. 결제 승인 후 DB 업데이트 실패
**원인**: Supabase RLS 정책 또는 네트워크 문제
**해결**:
- RLS 정책 확인
- Service Role Key 사용 (Webhook)
- 재시도 로직 구현

### 4. Webhook 수신 안됨
**원인**: URL 설정 오류 또는 HTTPS 미적용
**해결**:
- Webhook URL이 공개 접근 가능한지 확인
- HTTPS 적용 확인
- Toss Dashboard에서 Webhook 로그 확인

---

## 참고 자료

- [Toss Payments 공식 문서](https://docs.tosspayments.com/)
- [Toss Payments API Reference](https://docs.tosspayments.com/reference)
- [Payment Widget SDK](https://docs.tosspayments.com/reference/widget-sdk)
- [테스트 카드 번호](https://docs.tosspayments.com/guides/test-card)

---

## 버전 히스토리

- **v1.0** (2025-10-09): 초기 문서 작성
  - Step 1-4 구현 가이드
  - 테스트 시나리오
  - 프로덕션 체크리스트
