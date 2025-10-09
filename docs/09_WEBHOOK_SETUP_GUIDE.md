# Webhook 설정 가이드

## 개요

결제 시스템의 안정성과 보안을 위해 Webhook을 구현했습니다. Webhook을 통해 결제 상태 변경을 실시간으로 감지하고 자동으로 처리할 수 있습니다.

## Webhook 엔드포인트

### 1. Toss Payments Webhook
- **URL**: `https://your-domain.com/api/webhooks/toss`
- **Method**: POST
- **처리 이벤트**:
  - `DONE`: 결제 완료
  - `CANCELED`: 결제 취소
  - `FAILED`: 결제 실패

### 2. Stripe Webhook
- **URL**: `https://your-domain.com/api/webhooks/stripe`
- **Method**: POST
- **처리 이벤트**:
  - `checkout.session.completed`: 결제 완료
  - `checkout.session.expired`: 세션 만료
  - `payment_intent.payment_failed`: 결제 실패

## Toss Payments Webhook 설정

### 1. Toss Payments 개발자 센터 접속
1. https://developers.tosspayments.com/ 접속
2. 로그인 후 "내 개발정보" 메뉴 클릭

### 2. Webhook URL 등록
1. "Webhook" 섹션 찾기
2. Webhook URL 입력: `https://your-domain.com/api/webhooks/toss`
3. "저장" 버튼 클릭

### 3. Webhook Secret 확인
1. Webhook Secret 키 복사
2. `.env.local` 파일에 추가:
   ```
   TOSS_WEBHOOK_SECRET=your_webhook_secret_here
   ```

### 4. 테스트
```bash
# Toss에서 제공하는 테스트 도구 사용
# 또는 curl로 테스트
curl -X POST https://your-domain.com/api/webhooks/toss \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "PAYMENT_STATUS_CHANGED",
    "orderId": "test_order_id",
    "status": "DONE"
  }'
```

## Stripe Webhook 설정

### 1. Stripe Dashboard 접속
1. https://dashboard.stripe.com/ 접속
2. "Developers" → "Webhooks" 메뉴 클릭

### 2. Endpoint 추가
1. "Add endpoint" 버튼 클릭
2. Endpoint URL 입력: `https://your-domain.com/api/webhooks/stripe`
3. 이벤트 선택:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
4. "Add endpoint" 버튼 클릭

### 3. Signing Secret 확인
1. 생성된 Endpoint 클릭
2. "Signing secret" 섹션에서 "Reveal" 클릭
3. Secret 키 복사
4. `.env.local` 파일에 추가:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_signing_secret_here
   ```

### 4. 테스트
```bash
# Stripe CLI 사용
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 테스트 이벤트 전송
stripe trigger checkout.session.completed
```

## 로컬 개발 환경 설정

### 1. ngrok 사용 (권장)
```bash
# ngrok 설치
npm install -g ngrok

# 터널 생성
ngrok http 3000

# ngrok이 제공한 URL을 Webhook URL로 사용
# 예: https://abc123.ngrok.io/api/webhooks/toss
```

### 2. Stripe CLI 사용
```bash
# Stripe CLI 설치
brew install stripe/stripe-cli/stripe

# 로그인
stripe login

# Webhook 포워딩
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 제공된 webhook signing secret을 .env.local에 추가
```

## Webhook 동작 확인

### 1. 로그 확인
서버 콘솔에서 다음 로그 확인:
```
[Toss Webhook] Received: { eventType, orderId, status }
[Toss Webhook] Payment updated: { paymentId, status }
[Toss Webhook] Notification sent to trainer: trainerId

[Stripe Webhook] Event received: { type, id }
[Stripe Webhook] Checkout completed: { sessionId, paymentStatus }
[Stripe Webhook] Payment updated: { paymentId, status }
```

### 2. 데이터베이스 확인
```sql
-- payment 레코드 확인
SELECT
  id,
  order_id,
  payment_status,
  payment_metadata->'webhook' as webhook_data,
  paid_at,
  updated_at
FROM payments
WHERE order_id = 'your_order_id';

-- notification 레코드 확인
SELECT
  id,
  user_id,
  title,
  message,
  type,
  created_at
FROM notifications
WHERE link LIKE '%/bookings/%'
ORDER BY created_at DESC;
```

## 보안 고려사항

### 1. Webhook 서명 검증
- **Toss**: 현재 구현에서는 order_id 기반 검증
- **Stripe**: `stripe.webhooks.constructEvent()`로 자동 검증

### 2. HTTPS 필수
- 프로덕션 환경에서는 반드시 HTTPS 사용
- Let's Encrypt로 무료 SSL 인증서 발급 가능

### 3. 중복 처리 방지
- 이미 처리된 상태인지 확인 후 업데이트
- `payment_status` 체크로 중복 방지

### 4. 에러 처리
- 실패 시 적절한 HTTP 상태 코드 반환
- 로그 기록으로 문제 추적 가능

## 문제 해결

### Webhook이 호출되지 않음
1. Webhook URL이 올바른지 확인
2. 서버가 실행 중인지 확인
3. 방화벽 설정 확인
4. ngrok 터널이 활성화되어 있는지 확인

### 서명 검증 실패
1. `.env.local`의 Webhook Secret이 정확한지 확인
2. Stripe Dashboard의 Signing Secret과 일치하는지 확인
3. 환경 변수가 로드되었는지 확인 (`process.env.STRIPE_WEBHOOK_SECRET`)

### Payment 업데이트 실패
1. `order_id` 또는 `sessionId`가 정확한지 확인
2. 데이터베이스 연결 확인
3. RLS 정책 확인 (Service Role 사용 중)

## 프로덕션 체크리스트

- [ ] Webhook URL이 HTTPS로 설정됨
- [ ] `.env.local`에 모든 Secret 키 설정됨
- [ ] Toss Payments에 Webhook URL 등록됨
- [ ] Stripe에 Endpoint 추가됨
- [ ] 테스트 결제로 Webhook 동작 확인됨
- [ ] 로그 모니터링 설정됨
- [ ] 에러 알림 설정됨 (Sentry, Slack 등)

## 참고 문서

- [Toss Payments Webhook 가이드](https://docs.tosspayments.com/guides/webhook)
- [Stripe Webhooks 가이드](https://stripe.com/docs/webhooks)
- [ngrok 문서](https://ngrok.com/docs)
- [Stripe CLI 문서](https://stripe.com/docs/stripe-cli)
