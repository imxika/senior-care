# 시니어 재활 서비스 (Senior Care Service)

시니어를 위한 재활 PT 서비스 플랫폼입니다.

## 🎯 서비스 개요

- **타겟**: 건강한 시니어부터 거동이 불편한 어르신까지
- **서비스 타입**:
  - 방문 재활: 트레이너가 고객 집으로 방문
  - 센터 방문: 고객이 트레이너 센터로 방문
- **그룹 옵션**: 1:1, 1:2, 1:3

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 15.5 (App Router)
- **React**: 19.1.0
- **TypeScript**: 5.x
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui + Radix UI

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
  - 소셜 로그인: Kakao, Naver, Google
  - Email/Phone 인증
- **Storage**: Supabase Storage (프로필 이미지, 인증서 등)

### Payment
- **결제**: Toss Payments

## 📁 프로젝트 구조

```
senior-care/
├── app/                      # Next.js App Router
│   ├── (auth)/              # 인증 관련 페이지
│   ├── (customer)/          # 고객 페이지
│   ├── (trainer)/           # 트레이너 페이지
│   └── api/                 # API 라우트
├── components/              # React 컴포넌트
│   ├── ui/                 # shadcn/ui 컴포넌트
│   └── ...                 # 커스텀 컴포넌트
├── lib/                     # 유틸리티 함수
│   ├── supabase/           # Supabase 클라이언트
│   └── database.types.ts   # DB 타입 정의
└── supabase/               # 데이터베이스 설정
    ├── schema.sql          # 테이블 스키마
    ├── policies.sql        # RLS 정책
    └── setup.sh            # 설정 스크립트
```

## 🗄️ 데이터베이스 스키마

### 주요 테이블

1. **profiles** - 사용자 프로필 (고객/트레이너/관리자)
2. **customers** - 고객 상세 정보
   - 나이, 성별, 주소
   - 질병/건강 상태
   - 거동 능력 (independent/assisted/wheelchair/bedridden)
3. **trainers** - 트레이너 정보
   - 자격증, 경력, 전문 분야
   - 평점, 리뷰 수
   - 방문형/센터형 가능 여부
   - 서비스 가능 지역
4. **programs** - 재활 프로그램
   - 1:1, 1:2, 1:3 가격
   - 서비스 타입 (방문/센터/양쪽)
5. **bookings** - 예약
6. **reviews** - 리뷰/평가
7. **payments** - 결제 내역

## 🚀 시작하기

### 1. 환경 설정

```bash
# .env.local 파일 생성 (이미 있음)
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### 2. 데이터베이스 설정

```bash
# 스키마 및 RLS 정책 적용
npm run db:setup

# 또는 개별 실행
npm run db:schema    # 스키마만
npm run db:policies  # RLS 정책만
```

### 3. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인

## 📊 주요 기능

### 고객 (Customer)
- [x] 홈 - 서비스 소개 및 가격 안내
- [ ] 트레이너 검색 (지역, 서비스 타입)
- [ ] 트레이너 상세 정보
- [ ] 예약하기 (날짜/시간 선택)
- [ ] 결제 (Toss Payments)
- [ ] 내 예약 관리
- [ ] 리뷰 작성

### 트레이너 (Trainer)
- [ ] 프로필 설정
- [ ] 프로그램 등록
- [ ] 스케줄 관리
- [ ] 예약 확인/관리
- [ ] 리뷰 응답

### 관리자 (Admin)
- [ ] 트레이너 승인/관리
- [ ] 예약 현황
- [ ] 정산 관리

## 🔒 보안 (Row Level Security)

모든 테이블에 RLS 정책 적용:
- 사용자는 본인 데이터만 조회/수정 가능
- 트레이너는 예약된 고객 정보만 조회 가능
- 공개 정보(트레이너 목록, 프로그램)는 누구나 조회 가능

## 💰 가격 정책

### 방문 재활
- 1:1 프리미엄: 100,000원
- 1:2 듀얼: 75,000원/인 (총 150,000원)
- 1:3 그룹: 55,000원/인 (총 165,000원)

### 센터 방문
- 1:1 프리미엄: 70,000원
- 1:2 듀얼: 50,000원/인 (총 100,000원)
- 1:3 그룹: 35,000원/인 (총 105,000원)

## 📱 모바일 최적화

- 시니어 친화 디자인
  - 큰 폰트 (20px ~ 48px)
  - 큰 버튼 (최소 60px 높이)
  - 높은 대비
  - 터치 피드백

## 🔄 다음 단계

1. [ ] 인증 시스템 구축 (Kakao/Naver/Google OAuth)
2. [ ] 트레이너 목록 페이지
3. [ ] 예약 플로우
4. [ ] Toss Payments 연동
5. [ ] 관리자 대시보드
6. [ ] 푸시 알림

## 📝 개발 가이드

### Database Queries

```typescript
import {
  getVerifiedTrainers,
  getTrainersByServiceType,
  createBooking
} from '@/lib/supabase/queries'

// 트레이너 목록
const trainers = await getVerifiedTrainers()

// 방문형 트레이너만
const homeVisitTrainers = await getTrainersByServiceType('home_visit')

// 예약 생성
const booking = await createBooking({
  customer_id: customerId,
  trainer_id: trainerId,
  service_type: 'home_visit',
  group_size: 1,
  // ... 기타 필드
})
```

### TypeScript Types

```typescript
import { Database } from '@/lib/database.types'

type Trainer = Database['public']['Tables']['trainers']['Row']
type Booking = Database['public']['Tables']['bookings']['Insert']
```

## 🐛 트러블슈팅

### Supabase 연결 오류
- `.env.local` 파일 확인
- Supabase 프로젝트 URL/Key 확인

### RLS 정책 오류
- `npm run db:policies` 재실행
- Supabase Dashboard에서 정책 확인

---

**개발 기간**: 2025년 1월
**예산**: ₩20,000,000
**타겟 출시**: 2025년 1월
