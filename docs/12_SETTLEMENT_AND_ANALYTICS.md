# 정산 시스템 및 결제 분석 완료 (Settlement System & Payment Analytics)

환불 처리, 정산 시스템, 결제 분석 차트 구현 완료

## ✅ 완료된 작업

### 1. 환불 처리 기능 (Refund Processing)
- ✅ API 엔드포인트: `/api/payments/[paymentId]/refund`
- ✅ Admin 전용 환불 기능
- ✅ Toss Payments & Stripe 환불 처리
- ✅ 환불 사유 입력 및 메타데이터 저장
- ✅ 자동 알림 전송 (고객 & 트레이너)
- ✅ Admin UI: 예약 상세 페이지 및 결제 대시보드에 환불 버튼 추가

### 2. 정산 시스템 (Settlement System)
- ✅ `/admin/settlements` - 트레이너별 정산 관리 페이지
- ✅ 실제 결제 데이터 (`payments` 테이블) 기반 정산 계산
- ✅ 플랫폼 수수료 15% 자동 계산
- ✅ 정산 금액 = 총 매출 - 플랫폼 수수료 (85%)
- ✅ 트레이너별 상세 정산 내역
- ✅ 월별 통계 (총 매출, 플랫폼 수수료, 정산액, 이번 달 매출)
- ✅ Admin sidebar에 "정산 관리" 메뉴 추가

### 3. 결제 분석 차트 (Payment Analytics)
- ✅ `/admin/analytics` - 결제 분석 대시보드
- ✅ Recharts를 사용한 시각적 차트
- ✅ 6가지 주요 차트:
  1. 월별 매출 트렌드 (Bar Chart)
  2. 일별 결제 건수 (Line Chart)
  3. 결제 수단별 분포 (Pie Chart - Toss vs Stripe)
  4. 결제 상태별 분포 (Pie Chart)
  5. 서비스 타입별 매출 (Bar Chart - 방문/센터/온라인)
  6. 요약 통계 카드 (총 결제, 완료 결제, 총 매출, 평균 금액)
- ✅ Admin sidebar에 "결제 분석" 메뉴 추가

## 📁 생성/수정된 파일

### 환불 기능
```
생성:
- /app/api/payments/[paymentId]/refund/route.ts
- /components/admin/refund-payment-dialog.tsx
- /components/admin/payments-table-row.tsx
- /docs/11_REFUND_FEATURE.md

수정:
- /app/(dashboard)/admin/bookings/[id]/page.tsx
- /app/(dashboard)/admin/payments/page.tsx
```

### 정산 시스템
```
생성:
- /supabase/migrations/007_settlements.sql (DB 스키마 - 선택적)

수정:
- /app/(dashboard)/admin/settlements/page.tsx (payments 기반으로 전면 수정)
- /components/admin-sidebar.tsx (정산 관리 메뉴 추가)
```

### 결제 분석
```
생성:
- /app/(dashboard)/admin/analytics/page.tsx
- /components/admin/payment-analytics-charts.tsx

수정:
- /components/admin-sidebar.tsx (결제 분석 메뉴 추가)
```

## 🎯 주요 기능

### 환불 처리
**기능**:
- Admin만 결제 환불 가능
- 환불 사유 필수 입력
- Toss Payments & Stripe 자동 환불 처리
- DB 상태 업데이트 (`refunded`)
- 고객 및 트레이너 자동 알림

**사용 방법**:
1. Admin → 예약 상세 또는 결제 대시보드
2. 결제 완료 상태인 결제의 "환불" 버튼 클릭
3. 환불 사유 입력
4. "환불 진행" 클릭
5. 자동 처리 및 알림 전송

### 정산 시스템
**정산 계산 로직**:
```typescript
const platformCommissionRate = 0.15 // 15%
const totalRevenue = parseFloat(payment.amount)
const platformCommission = totalRevenue * platformCommissionRate
const settlementAmount = totalRevenue - platformCommission // 85%
```

**통계 카드** (5개):
1. **총 매출**: 모든 결제 완료된 금액 합계
2. **플랫폼 수수료**: 총 매출의 15%
3. **트레이너 정산액**: 총 매출의 85% (지급 예정)
4. **이번 달**: 이번 달 결제 완료 금액
5. **활동 트레이너**: 정산 대상 트레이너 수

**트레이너별 상세**:
- 트레이너 정보 (이름, 이메일, 시급)
- 정산 금액 (85%), 총 매출, 플랫폼 수수료
- 최근 완료된 결제 5건 (각 결제별 정산 금액 표시)
- 결제 수단 (Toss/Stripe) 표시

### 결제 분석 차트

**1. 월별 매출 트렌드** (Bar Chart)
- 최근 6개월 매출 추이
- 월별 매출 금액 표시

**2. 일별 결제 건수** (Line Chart)
- 최근 14일 결제 건수 추이
- 일별 결제 건수 표시

**3. 결제 수단별 분포** (Pie Chart)
- Toss Payments vs Stripe 비교
- 각 수단별 결제 건수 및 매출 금액
- 퍼센트 표시

**4. 결제 상태별 분포** (Pie Chart)
- 결제 완료, 대기, 실패, 취소, 환불
- 각 상태별 건수 및 퍼센트

**5. 서비스 타입별 매출** (Bar Chart)
- 방문형, 센터형, 온라인 비교
- 매출 금액 및 결제 건수

**6. 요약 통계**:
- 총 결제 건수
- 완료된 결제 건수
- 총 매출
- 평균 결제 금액

## 💻 기술 구현

### Recharts 사용
```typescript
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
```

### 데이터 가공 (useMemo)
```typescript
const monthlyRevenue = useMemo(() => {
  const monthMap = new Map<string, { revenue: number; count: number }>()

  payments
    .filter(p => p.payment_status === 'paid' && p.paid_at)
    .forEach(payment => {
      const date = new Date(payment.paid_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthMap.has(key)) {
        monthMap.set(key, { revenue: 0, count: 0 })
      }

      const data = monthMap.get(key)!
      data.revenue += parseFloat(payment.amount)
      data.count += 1
    })

  return Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6) // 최근 6개월
    .map(([month, data]) => ({
      month: month.substring(5) + '월',
      revenue: Math.round(data.revenue),
      count: data.count,
    }))
}, [payments])
```

### 색상 팔레트
```typescript
const COLORS = {
  toss: '#0064FF',      // Toss 블루
  stripe: '#635BFF',    // Stripe 퍼플
  paid: '#10B981',      // 초록 (완료)
  pending: '#F59E0B',   // 주황 (대기)
  failed: '#EF4444',    // 빨강 (실패)
  refunded: '#6B7280',  // 회색 (환불)
  home_visit: '#8B5CF6',// 보라 (방문형)
  center_visit: '#EC4899',// 핑크 (센터형)
  online: '#06B6D4',    // 시안 (온라인)
}
```

## 📊 데이터 흐름

### 정산 시스템
```
payments (결제 완료)
  → 트레이너별 그룹화
  → 총 매출 계산
  → 플랫폼 수수료 계산 (15%)
  → 정산 금액 계산 (85%)
  → UI 표시
```

### 결제 분석
```
payments (모든 결제)
  → 데이터 가공 (useMemo)
  → 차트 데이터 생성
  → Recharts 렌더링
  → 반응형 차트 표시
```

## 🚀 배포 체크리스트

### 환경 변수
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Admin RLS 우회용
- ✅ `TOSS_SECRET_KEY` - Toss 환불 API
- ✅ `STRIPE_SECRET_KEY` - Stripe 환불 API

### 데이터베이스
- ⚠️ `settlements` 테이블 (선택적) - 현재는 payments 테이블만 사용
- ✅ `payments` 테이블 - 환불 상태 지원 (`refunded`)
- ✅ `payment_metadata` - 환불 정보 저장

### 권한 확인
- ✅ Admin만 환불 가능
- ✅ Admin만 정산 페이지 접근
- ✅ Admin만 분석 페이지 접근

## 📈 향후 개선 사항

### 정산 시스템
- [ ] 정산 주기 자동화 (매월 1일)
- [ ] 정산 승인 워크플로우 (대기 → 승인 → 지급)
- [ ] 정산 내역 CSV 내보내기
- [ ] 트레이너 정산 상세 페이지 (`/admin/settlements/[trainerId]`)
- [ ] 정산 내역 필터링 (기간, 트레이너, 상태)

### 결제 분석
- [ ] 날짜 범위 필터 (커스텀 기간 선택)
- [ ] 차트 데이터 CSV 내보내기
- [ ] 시간대별 결제 패턴 분석
- [ ] 고객별 결제 분석
- [ ] 예측 분석 (다음 달 매출 예상)
- [ ] 비교 분석 (전월 대비, 전년 대비)

### 환불 기능
- [ ] 부분 환불 지원
- [ ] 환불 승인 워크플로우
- [ ] 환불 통계 대시보드
- [ ] 환불 사유 템플릿

## 🎓 학습 포인트

### Recharts 활용
- `ResponsiveContainer`로 반응형 차트 구현
- `useMemo`로 차트 데이터 최적화
- 다양한 차트 타입 (Bar, Line, Pie) 조합

### 데이터 가공
- Map 자료구조로 그룹화
- 날짜 기반 데이터 필터링
- 배열 메서드 체이닝 (filter, map, reduce, sort)

### 성능 최적화
- 클라이언트 컴포넌트 분리
- useMemo로 불필요한 재계산 방지
- 서버 컴포넌트에서 데이터 조회

## 📝 관련 문서
- [11_REFUND_FEATURE.md](./11_REFUND_FEATURE.md) - 환불 기능 상세
- [10_PAYMENT_COMPLETION_SUMMARY.md](./10_PAYMENT_COMPLETION_SUMMARY.md) - 결제 시스템 요약
- [09_WEBHOOK_SETUP_GUIDE.md](./09_WEBHOOK_SETUP_GUIDE.md) - 웹훅 설정
- [03_API_ENDPOINTS.md](./03_API_ENDPOINTS.md) - API 엔드포인트

## 🎯 요약

**구현 완료**:
1. ✅ 환불 처리 기능 (Admin 전용, Toss & Stripe 지원)
2. ✅ 정산 시스템 (트레이너별 정산 관리, 15% 수수료)
3. ✅ 결제 분석 차트 (6가지 차트, Recharts 사용)

**생성된 파일**: 7개
**수정된 파일**: 4개

**다음 단계**: 프로덕션 배포 및 실제 데이터 테스트

---
*작성일: 2025-01-09*
*작성자: Claude Code*
