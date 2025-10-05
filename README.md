# Senior Care MVP

시니어 재활 트레이너 예약 플랫폼 MVP

> **범용 서비스 마켓플레이스 템플릿**
> 교육, 홈서비스, 상담, 프리랜서 등 다양한 도메인에 적용 가능한 구조

---

## 📋 목차

- [프로젝트 개요](#-프로젝트-개요)
- [기술 스택](#-기술-스택)
- [주요 기능](#-주요-기능)
- [시작하기](#-시작하기)
- [문서](#-문서)
- [프로젝트 구조](#-프로젝트-구조)
- [개발 가이드](#-개발-가이드)
- [도메인 전환 가이드](#-도메인-전환-가이드)
- [트러블슈팅](#-트러블슈팅)

---

## 🎯 프로젝트 개요

### 핵심 컨셉

**서비스 제공자(Trainer) ↔ 예약 시스템 ↔ 고객(Customer)**

이 구조는 다음과 같은 비즈니스 모델에 적용 가능합니다:

- 🎓 **교육 플랫폼** (튜터링, 온라인 강의)
- 🏠 **홈서비스** (청소, 수리, 설치)
- 💼 **프리랜서 마켓플레이스** (디자인, 개발, 컨설팅)
- 💆 **웰니스 예약** (마사지, 요가, PT)
- 🎨 **크리에이터 마켓** (사진, 영상, 디자인)

### MVP 특징

- ✅ **완전한 인증 시스템** (Supabase Auth)
- ✅ **역할 기반 접근 제어** (고객/트레이너/관리자)
- ✅ **역할 전환 시스템** (고객 → 트레이너 신청)
- ✅ **예약 관리** (생성, 조회, 상태 관리)
- ✅ **알림 시스템** (예약 알림)
- ✅ **검색/필터** (서비스 제공자 찾기)
- ✅ **반응형 디자인** (모바일 최적화)
- ✅ **보안** (RLS, 자동 로그아웃)

---

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 15.5.4 (App Router, Turbopack)
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS v4 (OKLCH color space)
- **Icons**: Lucide React

### Backend
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (준비됨)
- **ORM**: Supabase Client

### DevOps
- **Deployment**: Vercel (추천)
- **Version Control**: Git
- **Package Manager**: npm

---

## ✨ 주요 기능

### 1. 인증 및 사용자 관리
- 이메일/비밀번호 회원가입/로그인
- 기본적으로 모든 사용자는 **고객(Customer)**으로 가입
- 30분 비활성 자동 로그아웃
- 프로필 관리

### 2. 역할 전환 시스템
- **고객 → 트레이너 전환 신청** (MVP에서는 즉시 승인)
- 트레이너 프로필 자동 생성
- 역할별 대시보드 자동 전환

### 3. 예약 시스템
- 트레이너 검색 및 필터링
- 날짜/시간 선택
- 서비스 타입 선택 (방문/센터)
- 예약 상태 관리 (대기/확정/완료/취소)
- 예약 내역 조회

### 4. 대시보드

#### 고객 대시보드
- 예약 현황 통계
- 트레이너 검색
- 예약 내역
- 트레이너 전환 신청

#### 트레이너 대시보드
- 예약 요청 관리
- 일정 관리
- 수익 통계
- 프로필 관리

#### 관리자 대시보드
- 전체 통계
- 사용자 관리
- 예약 관리

---

## 🚀 시작하기

### 필수 요구사항

- Node.js 18+
- npm
- Supabase 계정

### 설치

```bash
# 1. 저장소 클론
git clone <repository-url>
cd senior-care

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env.local

# 4. Supabase 설정
# - Supabase 프로젝트 생성
# - .env.local에 URL과 ANON_KEY 입력

# 5. 데이터베이스 마이그레이션
npx supabase db push

# 6. 개발 서버 실행
npm run dev
```

### 환경 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📚 문서

### 핵심 문서

- **[데이터베이스 스키마](./docs/DATABASE_SCHEMA.md)** - 테이블 구조, ID 참조 규칙, 쿼리 패턴
- **[코딩 컨벤션](./docs/CODING_CONVENTIONS.md)** - TypeScript, React, Supabase 패턴

### 주요 내용

#### ID 참조 체인
```
auth.users.id
  → profiles.id (동일)
    → customers.profile_id → customers.id
    → trainers.profile_id → trainers.id
      → bookings.customer_id
      → bookings.trainer_id
```

**⚠️ 중요**: `bookings`는 `customers.id`와 `trainers.id`를 참조합니다 (`profiles.id` 아님!)

#### 자주 사용하는 패턴
```typescript
// 1. 현재 사용자 customer.id 조회
const { data: { user } } = await supabase.auth.getUser()
const { data: customer } = await supabase
  .from('customers')
  .select('id')
  .eq('profile_id', user.id)
  .single()

// 2. 예약 조회
const { data: bookings } = await supabase
  .from('bookings')
  .select('*')
  .eq('customer_id', customer.id)  // ⚠️ user.id 아님!
```

---

## 📁 프로젝트 구조

```
senior-care/
├── app/
│   ├── (auth)/              # 인증 페이지 (로그인, 회원가입)
│   ├── (dashboard)/         # 역할별 대시보드
│   │   ├── customer/        # 고객 대시보드
│   │   ├── trainer/         # 트레이너 대시보드
│   │   └── admin/           # 관리자 대시보드
│   ├── (public)/            # 공개 페이지
│   │   └── trainers/        # 트레이너 목록, 상세
│   └── api/                 # API routes
├── components/
│   ├── ui/                  # shadcn/ui 컴포넌트
│   └── *.tsx                # 기능별 컴포넌트
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # 클라이언트 사이드
│   │   └── server.ts        # 서버 사이드
│   └── utils.ts
├── docs/                    # 프로젝트 문서
├── supabase/
│   └── migrations/          # DB 마이그레이션
└── types/                   # TypeScript 타입
```

---

## 💻 개발 가이드

### 새 기능 추가 시

1. **데이터베이스 변경**
   ```bash
   # 마이그레이션 파일 생성
   touch supabase/migrations/$(date +%Y%m%d)_feature_name.sql

   # 마이그레이션 적용
   npx supabase db push
   ```

2. **페이지 추가**
   - Server Component 우선 사용
   - Next.js 15 패턴 준수 (`params`는 Promise)
   - 인증 체크 필수

3. **컴포넌트 추가**
   - shadcn/ui 컴포넌트 우선 사용
   - 커스텀 컴포넌트는 최소화
   - Props 타입 명시

### 명령어

```bash
# 개발 서버
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start

# Supabase 마이그레이션
npx supabase db push
```

---

## 🔄 도메인 전환 가이드

이 프로젝트를 다른 도메인에 적용하려면:

### 1. 용어 변경 (검색/치환)
```
Trainer → Teacher/Tutor/Consultant/...
Customer → Student/Client/User/...
Senior Care → [Your Service Name]
```

### 2. 서비스 타입 변경
```typescript
// DB enum 변경
service_type: 'home_visit' | 'center_visit'
→ 'online' | 'offline'
→ 'onsite' | 'remote'
```

### 3. 전문 분야 조정
```typescript
// trainers.specialties
재활/물리치료 → 수학/영어/프로그래밍/...
→ 청소/수리/설치/...
→ 디자인/개발/마케팅/...
```

### 4. 가격 모델 조정
```typescript
hourly_rate → session_rate / project_rate / package_price
```

---

## 🐛 트러블슈팅

### 자주 발생하는 이슈

#### 1. "customer_id 조회 실패"
```typescript
// ❌ 잘못된 방법
.eq('customer_id', user.id)

// ✅ 올바른 방법
const { data: customer } = await supabase
  .from('customers')
  .select('id')
  .eq('profile_id', user.id)
  .single()

.eq('customer_id', customer.id)
```

#### 2. "params should be awaited"
```typescript
// ❌ Next.js 14 패턴
params: { id: string }
const id = params.id

// ✅ Next.js 15 패턴
params: Promise<{ id: string }>
const { id } = await params
```

#### 3. "Select 값이 전송 안 됨"
```typescript
// ✅ Client Component에서 useState 사용
const [selectValue, setSelectValue] = useState('')

const handleSubmit = (e) => {
  const formData = new FormData(e.currentTarget)
  formData.set('field', selectValue)  // 수동으로 추가
}
```

---

## 📝 라이선스

MIT

---

## 👥 기여

기여는 언제나 환영합니다!

1. Fork the project
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

**마지막 업데이트**: 2025-01-04
**버전**: 1.0.0-MVP
