# Type Cleanup TODO

남은 `any` 타입을 점진적으로 수정하기 위한 체크리스트입니다.

## 우선순위

### 🔴 High Priority (사용자 직접 영향)
- [ ] `app/(public)/trainers/[id]/page.tsx` - 트레이너 상세 페이지 (1개)
- [ ] `app/checkout/[bookingId]/page.tsx` - 결제 페이지 (6개)
- [ ] `app/test-payment/page.tsx` - 결제 테스트 페이지 (테스트용, 삭제 고려)

### 🟡 Medium Priority (관리자 기능)
- [ ] `app/(dashboard)/admin/bookings/page.tsx` (1개)
- [ ] `app/(dashboard)/admin/bookings/recommended/[id]/match/actions.ts` (2개)
- [ ] `app/(dashboard)/admin/payments/page.tsx` (1개)
- [ ] `app/(dashboard)/admin/settlements/page.tsx` (1개)
- [ ] `app/(dashboard)/admin/users/user-management-client.tsx` (2개)

### 🟢 Low Priority (API 라우트 - 내부)
- [ ] `app/api/auth/status/route.ts` (1개)
- [ ] `app/api/bookings/create-test/route.ts` (1개)
- [ ] `app/api/bookings/route.ts` (1개)
- [ ] `app/api/cron/check-auto-match-timeout/route.ts` (1개)
- [ ] `app/api/payments/[paymentId]/cancel/route.ts` (1개)
- [ ] `app/api/payments/[paymentId]/refund/route.ts` (4개)
- [ ] `app/api/payments/[paymentId]/refund-customer/route.ts` (3개)
- [ ] `app/api/payments/stripe/confirm/route.ts` (1개)
- [ ] `app/api/payments/stripe/create-session/route.ts` (1개)
- [ ] `app/api/payments/toss/route.ts` (1개)
- [ ] `app/api/reviews/[id]/response/route.ts` (1개)
- [ ] `app/bookings/page.tsx` (7개)
- [ ] `app/payments/success/page.tsx` (2개)

### 🔵 Components
- [ ] `components/admin/payment-analytics-charts.tsx` (1개)
- [ ] `components/admin/payments-table-row.tsx` (1개)

## 이미 수정된 항목 ✅

### Stripe API 버전
- ✅ `app/(dashboard)/customer/bookings/[id]/actions.ts`
- ✅ `app/api/payments/[paymentId]/refund-customer/route.ts`
- ✅ `app/api/payments/[paymentId]/refund/route.ts`
- ✅ `app/api/payments/stripe/create-session/route.ts`
- ✅ `app/api/webhooks/stripe/route.ts`

### 타입 에러
- ✅ `lib/types.ts` - Payment 타입에 payment_provider 추가
- ✅ `app/(dashboard)/admin/bookings/[id]/page.tsx` - read_at → is_read
- ✅ `app/(dashboard)/customer/bookings/[id]/actions.ts` - cancellationFee 수정
- ✅ `app/(dashboard)/trainer/settings/security/security-form.tsx` - setSuccess 추가
- ✅ `components/sidebar-left.tsx` - Search, Calendar import 추가

### 주요 파일
- ✅ `app/(dashboard)/admin/settlements/page.tsx` - 타입 정의 추가
- ✅ `app/(dashboard)/customer/bookings/page.tsx` - 타입 정의 추가
- ✅ `app/(dashboard)/admin/bookings/auto-matching/page.tsx` - 타입 정의 추가
- ✅ `app/api/bookings/list/route.ts` - Booking 타입 사용
- ✅ `app/api/webhooks/toss/route.ts` - Record<string, unknown> 사용

## 수정 가이드

### 패턴 1: catch 블록
```typescript
// ❌ Before
} catch (error: any) {
  return NextResponse.json({ error: error.message }, { status: 500 });
}

// ✅ After
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  return NextResponse.json({ error: errorMessage }, { status: 500 });
}
```

### 패턴 2: 함수 파라미터
```typescript
// ❌ Before
const handleData = (data: any) => {
  return data.property;
}

// ✅ After
interface DataType {
  property: string;
}
const handleData = (data: DataType) => {
  return data.property;
}
```

### 패턴 3: 배열/객체
```typescript
// ❌ Before
const items: any[] = [];

// ✅ After
interface Item {
  id: string;
  name: string;
}
const items: Item[] = [];
```

## 진행 상황

- **전체**: ~100개
- **수정 완료**: ~30개 (30%)
- **남은 작업**: ~70개

## 목표

- **1주차**: High Priority 완료
- **2주차**: Medium Priority 완료
- **3주차**: Low Priority + Components 완료
- **4주차**: 최종 검토 및 ESLint error로 변경

## 참고

- ESLint 설정: `eslint.config.mjs`에서 `@typescript-eslint/no-explicit-any: "warn"`
- 코딩 컨벤션: `docs/01_CODING_CONVENTIONS.md`
- 타입 정의: `lib/types.ts`
