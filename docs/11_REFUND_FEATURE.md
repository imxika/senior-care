# 환불 처리 기능 (Refund Processing Feature)

결제 환불 처리 기능 구현 완료 - Admin만 사용 가능

## ✅ 완료된 작업

### 1. API 엔드포인트
- ✅ `/app/api/payments/[paymentId]/refund/route.ts` - 환불 API
  - Admin 권한 확인
  - Toss Payments 환불 처리
  - Stripe 환불 처리
  - DB 상태 업데이트 (`refunded`)
  - 고객 및 트레이너 알림 전송
  - 환불 메타데이터 저장 (사유, 환불일시, 환불자 ID)

### 2. UI 컴포넌트
- ✅ `/components/admin/refund-payment-dialog.tsx` - 환불 다이얼로그
  - 환불 사유 입력 필드 (필수)
  - 결제 정보 확인 (금액, 결제 수단, 결제 ID)
  - 환불 처리 중 로딩 상태
  - 성공/실패 토스트 알림
  - 환불 완료 후 자동 새로고침

- ✅ `/components/admin/payments-table-row.tsx` - 결제 테이블 행 (클라이언트 컴포넌트)
  - 결제 상태별 배지 (`paid`, `pending`, `refunded`, `cancelled`, `failed`)
  - `paid` 상태일 때만 환불 버튼 표시

### 3. 페이지 업데이트
- ✅ `/app/(dashboard)/admin/bookings/[id]/page.tsx` - Admin 예약 상세
  - 결제 정보 섹션에 환불 버튼 추가
  - 환불 완료 시 환불 정보 표시 (사유, 환불일시)
  - `refunded` 상태 배지 추가

- ✅ `/app/(dashboard)/admin/payments/page.tsx` - Admin 결제 대시보드
  - 테이블 행을 클라이언트 컴포넌트로 분리
  - 각 결제 행에 환불 버튼 추가 (`paid` 상태만)

## 🔧 기술 구현

### 환불 API 흐름
```
1. Admin 권한 확인
   ↓
2. Service Role로 결제 데이터 조회 (RLS 우회)
   ↓
3. 환불 가능 상태 검증 (payment_status === 'paid')
   ↓
4. 결제 수단별 환불 처리
   - Toss: POST /v1/payments/{paymentKey}/cancel
   - Stripe: stripe.refunds.create({ payment_intent })
   ↓
5. DB 업데이트
   - payment_status: 'refunded'
   - refunded_at: 현재 시각
   - payment_metadata: 환불 정보 추가
   ↓
6. 알림 전송
   - 고객: "결제가 환불되었습니다"
   - 트레이너: "예약이 환불되었습니다"
```

### Toss Payments 환불
```typescript
const response = await fetch(
  `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cancelReason: reason
    })
  }
)
```

### Stripe 환불
```typescript
const refund = await stripe.refunds.create({
  payment_intent: paymentIntentId,
  reason: 'requested_by_customer',
  metadata: {
    refund_reason: reason,
    refunded_by: user.id,
    refunded_at: new Date().toISOString()
  }
})
```

## 📋 사용 방법

### Admin - 예약 상세에서 환불
1. `/admin/bookings/[id]` 페이지 접속
2. "결제 정보" 섹션에서 "환불" 버튼 클릭
3. 환불 사유 입력 (필수)
4. "환불 진행" 버튼 클릭
5. 성공 시 자동 새로고침, 환불 정보 표시

### Admin - 결제 대시보드에서 환불
1. `/admin/payments` 페이지 접속
2. 테이블에서 환불할 결제 찾기 (결제 완료 상태만)
3. "환불" 버튼 클릭
4. 환불 사유 입력 후 진행

## 🔐 보안 및 권한

### 권한 검증
- **Admin만 접근 가능**: `user_type === 'admin'` 확인
- **Service Role 사용**: RLS 우회하여 모든 결제 데이터 접근

### 상태 검증
- **환불 가능 조건**:
  - `payment_status === 'paid'` (결제 완료 상태)
  - 이미 환불된 결제는 재환불 불가

### 데이터 무결성
- **트랜잭션 처리**:
  - 외부 API 환불 실패 시 DB 업데이트 하지 않음
  - 환불 성공했지만 DB 업데이트 실패 시 에러 응답 (수동 처리 필요)

## 📊 DB 스키마

### payments 테이블
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
    refundedBy: string (user_id),
    refundedAt: string (ISO timestamp)
  }
}
```

## 🧪 테스트 시나리오

### 정상 케이스
- [x] Toss Payments 환불 성공
- [x] Stripe 환불 성공
- [x] 환불 후 DB 업데이트 확인
- [x] 고객 알림 전송 확인
- [x] 트레이너 알림 전송 확인
- [x] 환불 정보 UI 표시 확인

### 에러 케이스
- [x] 권한 없는 사용자 접근 (403 Forbidden)
- [x] 환불 불가능한 상태 (400 Bad Request)
- [x] 이미 환불된 결제 재환불 시도 (400 Bad Request)
- [x] 결제 정보 없음 (404 Not Found)
- [x] 외부 API 환불 실패 (500 Internal Server Error)

## 🚀 다음 단계 (선택 사항)

### 개선 사항
- [ ] 부분 환불 기능 (일부 금액만 환불)
- [ ] 환불 승인 워크플로우 (2단계 승인)
- [ ] 환불 내역 통계 차트
- [ ] 환불 사유 템플릿 (드롭다운 선택)
- [ ] 환불 알림 이메일 발송

### 관리 기능
- [ ] 환불 내역 필터링 및 검색
- [ ] 환불 대시보드 (월별/연도별 환불 통계)
- [ ] 환불 CSV 내보내기
- [ ] 환불 감사 로그 (audit log)

## 📝 관련 문서
- [01_TECH_STACK.md](./01_TECH_STACK.md) - 기술 스택
- [03_API_ENDPOINTS.md](./03_API_ENDPOINTS.md) - API 엔드포인트
- [09_WEBHOOK_SETUP_GUIDE.md](./09_WEBHOOK_SETUP_GUIDE.md) - 웹훅 설정
- [10_PAYMENT_COMPLETION_SUMMARY.md](./10_PAYMENT_COMPLETION_SUMMARY.md) - 결제 시스템 요약

## 🎯 요약

**환불 처리 기능 구현 완료**:
- ✅ API 엔드포인트 (POST /api/payments/[paymentId]/refund)
- ✅ Admin UI 컴포넌트 (환불 다이얼로그)
- ✅ 예약 상세 페이지 통합
- ✅ 결제 대시보드 통합
- ✅ Toss Payments & Stripe 지원
- ✅ 자동 알림 전송
- ✅ 환불 메타데이터 저장

**생성된 파일**:
- `/app/api/payments/[paymentId]/refund/route.ts`
- `/components/admin/refund-payment-dialog.tsx`
- `/components/admin/payments-table-row.tsx`

**수정된 파일**:
- `/app/(dashboard)/admin/bookings/[id]/page.tsx`
- `/app/(dashboard)/admin/payments/page.tsx`
