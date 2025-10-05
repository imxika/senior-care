# 🏥 시니어 케어 서비스 - MVP 사업 계획서

## 📋 비즈니스 개요

### 서비스명 (임시)
- **value**: `senior` (영구 식별자)
- **title**: "시니어 케어 MVP" → 추후 "실버케어" / "시니어케어 플랫폼" 등으로 변경 가능

### 핵심 가치 제안
> "건강한 노년부터 거동 불편 시니어까지, 모든 케어 서비스를 한 곳에서"

**문제 인식:**
- 🔍 **수요자**: 어떤 서비스가 있는지, 비용은 얼마인지 찾기 어려움
- 📢 **공급자**: 고객을 찾을 방법이 없음, 홍보 채널 부재
- 💰 **가격 불투명**: 서비스별 요금 비교 불가능
- 🏥 **신뢰 문제**: 검증되지 않은 제공자에 대한 불안

**솔루션:**
- 📱 쉬운 검색 & 예약 시스템
- 💳 투명한 가격 비교
- ⭐ 리뷰 & 평점 시스템
- 🔐 공급자 검증 & 보증
- 💰 간편 결제 (토스페이먼츠)

---

## 🎯 MVP 핵심 기능 (Phase 1: 재활 프로그램)

### 1단계: 재활 트레이닝 PT 서비스 (양방향)

#### 🏠 방문형 서비스 (Home Visit)
```
트레이너가 고객의 집/시설로 방문
- 거동 불편 시니어 대상
- 재택 재활 운동
- 병원 퇴원 후 홈케어
- 요양원/주간보호센터 방문
- 1:1 맞춤 재활 프로그램
```

**장점:**
- ✅ 이동 부담 없음
- ✅ 익숙한 환경에서 진행
- ✅ 보호자 함께 참여 가능
- ✅ 집안 환경에 맞춘 운동 지도

**요금 구조:**
- 기본 요금: 60분 50,000원 ~ 80,000원
- 출장비: 지역별 5,000 ~ 15,000원
- 패키지 할인: 10회권 10% 할인

---

#### 🏋️ 센터 방문형 서비스 (Center Visit)
```
고객이 트레이너의 센터/스튜디오로 방문
- 건강한 시니어 대상 (자가 이동 가능)
- 전문 재활 장비 활용
- 소그룹 클래스 가능
- 센터 부대시설 이용 (샤워실, 라커룸 등)
```

**장점:**
- ✅ 전문 장비 활용 가능
- ✅ 방문형 대비 저렴한 비용
- ✅ 다른 시니어와 교류
- ✅ 체계적인 시설 운영

**요금 구조:**
- 1:1 개인 PT: 60분 40,000원 ~ 60,000원
- 소그룹 (2-4명): 60분 30,000원 ~ 40,000원
- 정기 회원권: 월 4회 / 8회 / 12회 패키지

---

#### 🔄 하이브리드 옵션
```
방문 + 센터 병행 프로그램
- 주 2회: 센터 방문 (전문 장비 운동)
- 주 1회: 가정 방문 (환경 맞춤 운동)
- 단계별 전환: 회복 단계에 따라 방문 → 센터 이동
```

**활용 시나리오:**
1. **초기 재활기**: 방문형 집중 → 회복 후 센터 전환
2. **거동 개선 후**: 센터 주 2회 + 홈 관리 주 1회
3. **계절별 조정**: 겨울(방문) ↔ 봄/가을(센터)

### 사용자 유형
1. **수요자 (시니어 & 보호자)**
   - 직접 이용 시니어 (60-75세, 스마트폰 사용 가능)
   - 보호자가 대리 예약 (75세 이상)
   - 케어 기관 (요양원, 주간보호센터)

2. **공급자 (재활 트레이너)**
   - 물리치료사 (PT, Physical Therapist)
   - 작업치료사 (OT, Occupational Therapist)
   - 운동처방사
   - 시니어 전문 트레이너

3. **관리자**
   - 플랫폼 운영자
   - 공급자 검증 담당
   - CS 담당

---

## 🏗️ 기술 아키텍처

### 시스템 구성
```
┌─────────────────────────────────────────┐
│  Sanity CMS (콘텐츠 관리)                │
│  - 재활 프로그램 정보                     │
│  - 서비스 설명 페이지                     │
│  - 공급자 프로필 템플릿                   │
│  - 블로그/건강 정보                       │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│  Supabase (비즈니스 로직 & 데이터)         │
│  - 사용자 인증 (소셜 로그인)              │
│  - 예약 시스템                           │
│  - 공급자 관리                           │
│  - 리뷰 & 평점                           │
│  - 실시간 알림                           │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│  Next.js 웹사이트 (프론트엔드)            │
│  - 반응형 디자인 (모바일 우선)            │
│  - 큰 글씨 & 간편한 UI                   │
│  - 음성 안내 (선택)                      │
│  - PWA (앱처럼 사용)                     │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│  외부 서비스 통합                         │
│  - 토스페이먼츠 (결제)                    │
│  - 카카오/네이버/구글 (소셜 로그인)        │
│  - 카카오 알림톡 (예약 확인)              │
│  - 카카오맵 (위치 검색)                   │
└─────────────────────────────────────────┘
```

---

## 📱 핵심 기능 명세

### A. 수요자 기능

#### 1. 회원가입 & 로그인
- ✅ 카카오톡 간편 가입 (주 타겟)
- ✅ 네이버 로그인
- ✅ 구글 로그인
- ✅ 이메일 가입
- ✅ 전화번호 가입 (SMS 인증)

**특이사항:**
- 보호자 계정 연동 기능
- 간병인/가족 대리 예약 가능
- 큰 버튼, 명확한 안내

#### 2. 서비스 검색 & 예약
```typescript
// 검색 필터
- 지역: 시/구/동 선택
- 서비스 유형: 재활 PT / 이동 지원 / 목욕 케어 등
- 가격대: 3-5만원 / 5-10만원 / 10만원 이상
- 방문 가능 시간: 평일 오전/오후, 주말
- 공급자 성별: 남성/여성 선택 가능
- 특화 분야: 뇌졸중 재활, 관절염, 낙상 예방 등
```

#### 3. 예약 프로세스
```
1단계: 서비스 선택
   ↓
2단계: 공급자 선택 (리뷰 & 평점 확인)
   ↓
3단계: 날짜 & 시간 선택
   ↓
4단계: 증상/요청사항 입력
   ↓
5단계: 결제 (토스페이먼츠)
   ↓
6단계: 예약 확정 (카카오 알림톡 발송)
```

#### 4. 예약 관리
- 예약 내역 조회
- 일정 변경 / 취소
- 리뷰 작성
- 영수증 발급

### B. 공급자 기능

#### 1. 공급자 등록
- 자격증 업로드 (물리치료사, 작업치료사 면허)
- 경력 사항
- 서비스 가능 지역
- 가격 설정
- 일정 관리

#### 2. 예약 관리
- 실시간 예약 알림
- 예약 수락/거절
- 일정 캘린더
- 고객 정보 확인

#### 3. 정산 관리
- 수입 내역
- 출금 신청
- 세금계산서 발급

### C. 관리자 기능

#### 1. 공급자 검증
- 자격증 확인
- 경력 검증
- 승인/거절

#### 2. 서비스 모니터링
- 예약 현황
- 매출 통계
- 리뷰 관리
- 분쟁 조정

---

## 💾 데이터베이스 설계 (Supabase)

### 핵심 테이블 구조

```sql
-- 조직 (멀티 사이트)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id TEXT NOT NULL,  -- 'senior'
  name TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 (수요자)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID REFERENCES auth.users(id),  -- Supabase Auth
  name TEXT NOT NULL,
  phone TEXT,
  birth_date DATE,
  gender TEXT,
  address JSONB,  -- { si, gu, dong, detail }
  mobility_level TEXT,  -- 'healthy', 'limited', 'wheelchair'
  medical_conditions JSONB,  -- 기저질환 정보
  guardian_id UUID REFERENCES customers(id),  -- 보호자 연결
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 공급자 (재활 트레이너)
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  license_type TEXT,  -- 'physical_therapist', 'occupational_therapist', etc.
  license_number TEXT,
  license_verified BOOLEAN DEFAULT false,
  experience_years INTEGER,
  specializations TEXT[],  -- ['stroke_rehab', 'joint_care', 'fall_prevention']
  service_areas JSONB,  -- [{ si, gu, dong[] }]
  gender TEXT,
  bio TEXT,
  profile_image_url TEXT,
  rating DECIMAL(3,2) DEFAULT 0.0,
  total_sessions INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',  -- 'pending', 'active', 'suspended'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 재활 프로그램 (Sanity 연동)
CREATE TABLE rehab_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sanity_doc_id TEXT,  -- Sanity 문서 ID
  provider_id UUID REFERENCES providers(id),
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,  -- 60, 90, 120
  base_price DECIMAL(10,2),
  target_conditions TEXT[],  -- ['stroke', 'arthritis', 'fall_risk']
  is_home_visit BOOLEAN DEFAULT true,
  is_online BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 예약
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  provider_id UUID REFERENCES providers(id),
  program_id UUID REFERENCES rehab_programs(id),

  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,

  address JSONB NOT NULL,  -- 방문 주소
  special_requests TEXT,

  status TEXT DEFAULT 'pending',  -- 'pending', 'confirmed', 'completed', 'cancelled'

  -- 가격 정보
  base_price DECIMAL(10,2),
  additional_fees JSONB,  -- { travel_fee: 10000, ... }
  total_price DECIMAL(10,2),

  -- 결제 정보
  payment_id TEXT,  -- 토스페이먼츠 결제 ID
  payment_status TEXT,  -- 'pending', 'paid', 'refunded'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 리뷰 & 평점
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id),
  customer_id UUID REFERENCES customers(id),
  provider_id UUID REFERENCES providers(id),

  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  helpful_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 공급자 일정
CREATE TABLE provider_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES providers(id),

  day_of_week INTEGER,  -- 0=일요일, 6=토요일
  start_time TIME,
  end_time TIME,

  is_available BOOLEAN DEFAULT true,

  UNIQUE(provider_id, day_of_week, start_time)
);

-- 공급자 휴무일
CREATE TABLE provider_holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES providers(id),
  date DATE NOT NULL,
  reason TEXT,

  UNIQUE(provider_id, date)
);

-- 알림
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,  -- 'booking_confirmed', 'booking_cancelled', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) 설정
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 본인 데이터만 조회 가능
CREATE POLICY "Users can view their own data"
  ON customers FOR SELECT
  USING (auth_id = auth.uid());

CREATE POLICY "Providers can view their bookings"
  ON bookings FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid()
    )
  );
```

---

## 🎨 Sanity 스키마 설계

### 콘텐츠 타입

```typescript
// schemas/senior/rehabilitationProgram.ts
export default {
  name: 'rehabilitationProgram',
  title: '재활 프로그램',
  type: 'document',
  fields: [
    // 사이트 식별
    {
      name: 'site',
      type: 'string',
      initialValue: 'senior',
      hidden: true,
    },

    // 기본 정보
    {
      name: 'title',
      title: '프로그램명',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'slug',
      title: 'URL 슬러그',
      type: 'slug',
      options: { source: 'title' },
    },
    {
      name: 'category',
      title: '카테고리',
      type: 'string',
      options: {
        list: [
          { title: '재활 PT', value: 'rehab_pt' },
          { title: '이동 지원', value: 'mobility_support' },
          { title: '목욕 케어', value: 'bathing_care' },
          { title: '약 복용 관리', value: 'medication_management' },
        ],
      },
    },

    // 상세 설명
    {
      name: 'description',
      title: '프로그램 설명',
      type: 'betterPortableText',
    },
    {
      name: 'mainImage',
      title: '대표 이미지',
      type: 'imageWithMeta',
    },
    {
      name: 'gallery',
      title: '갤러리',
      type: 'gallery',
    },

    // 대상
    {
      name: 'targetConditions',
      title: '대상 증상/질환',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: '뇌졸중 재활', value: 'stroke' },
          { title: '관절염', value: 'arthritis' },
          { title: '낙상 예방', value: 'fall_prevention' },
          { title: '근력 강화', value: 'strength_training' },
          { title: '균형 개선', value: 'balance_improvement' },
        ],
      },
    },

    // 서비스 옵션
    {
      name: 'serviceOptions',
      title: '서비스 옵션',
      type: 'object',
      fields: [
        {
          name: 'isHomeVisit',
          title: '방문 서비스',
          type: 'boolean',
          initialValue: true,
        },
        {
          name: 'isOnline',
          title: '온라인 가능',
          type: 'boolean',
          initialValue: false,
        },
        {
          name: 'durationMinutes',
          title: '소요 시간 (분)',
          type: 'number',
          options: {
            list: [60, 90, 120],
          },
        },
      ],
    },

    // 가격 정보
    {
      name: 'pricing',
      title: '가격 정보',
      type: 'object',
      fields: [
        {
          name: 'basePrice',
          title: '기본 가격',
          type: 'number',
        },
        {
          name: 'travelFee',
          title: '출장비',
          type: 'number',
        },
        {
          name: 'packageOptions',
          title: '패키지 옵션',
          type: 'array',
          of: [{
            type: 'object',
            fields: [
              { name: 'sessions', type: 'number', title: '회차' },
              { name: 'price', type: 'number', title: '가격' },
              { name: 'discount', type: 'number', title: '할인율 (%)' },
            ],
          }],
        },
      ],
    },

    // SEO
    {
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    },
  ],
}

// schemas/senior/providerProfile.ts (공급자 프로필 템플릿)
export default {
  name: 'providerProfile',
  title: '공급자 프로필 템플릿',
  type: 'document',
  fields: [
    {
      name: 'site',
      type: 'string',
      initialValue: 'senior',
      hidden: true,
    },
    {
      name: 'name',
      title: '이름',
      type: 'string',
    },
    {
      name: 'profileImage',
      title: '프로필 사진',
      type: 'imageWithMeta',
    },
    {
      name: 'licenseType',
      title: '자격증 종류',
      type: 'string',
      options: {
        list: [
          { title: '물리치료사', value: 'physical_therapist' },
          { title: '작업치료사', value: 'occupational_therapist' },
          { title: '운동처방사', value: 'exercise_prescriber' },
          { title: '시니어 전문 트레이너', value: 'senior_trainer' },
        ],
      },
    },
    {
      name: 'bio',
      title: '소개',
      type: 'betterPortableText',
    },
    {
      name: 'specializations',
      title: '전문 분야',
      type: 'array',
      of: [{ type: 'string' }],
    },
    {
      name: 'certifications',
      title: '보유 자격증',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'name', type: 'string', title: '자격증명' },
          { name: 'issuer', type: 'string', title: '발급기관' },
          { name: 'year', type: 'number', title: '취득년도' },
        ],
      }],
    },
  ],
}

// schemas/senior/blogPost.ts (건강 정보 블로그)
export default {
  name: 'seniorBlogPost',
  title: '건강 정보',
  type: 'document',
  fields: [
    {
      name: 'site',
      type: 'string',
      initialValue: 'senior',
      hidden: true,
    },
    {
      name: 'title',
      title: '제목',
      type: 'string',
    },
    {
      name: 'slug',
      type: 'slug',
      options: { source: 'title' },
    },
    {
      name: 'category',
      title: '카테고리',
      type: 'string',
      options: {
        list: [
          { title: '재활 운동', value: 'rehab_exercise' },
          { title: '낙상 예방', value: 'fall_prevention' },
          { title: '식이요법', value: 'diet' },
          { title: '건강 관리', value: 'health_management' },
        ],
      },
    },
    {
      name: 'content',
      title: '내용',
      type: 'betterPortableText',
    },
    {
      name: 'author',
      title: '작성자',
      type: 'reference',
      to: [{ type: 'providerProfile' }],
    },
    {
      name: 'publishedAt',
      title: '발행일',
      type: 'datetime',
    },
    {
      name: 'seo',
      type: 'seo',
    },
  ],
}
```

---

## 🔐 인증 & 권한 시스템

### Supabase Auth 설정

```typescript
// lib/auth-config.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 소셜 로그인 설정
export const authProviders = {
  kakao: {
    enabled: true,
    primary: true,  // 주 타겟
  },
  naver: {
    enabled: true,
  },
  google: {
    enabled: true,
  },
}

// 역할 기반 권한
export const ROLES = {
  CUSTOMER: 'customer',
  PROVIDER: 'provider',
  ADMIN: 'admin',
} as const

export const PERMISSIONS = {
  // 고객 권한
  'booking.create': ['customer'],
  'booking.view_own': ['customer'],
  'review.create': ['customer'],

  // 공급자 권한
  'booking.manage': ['provider', 'admin'],
  'schedule.manage': ['provider', 'admin'],
  'profile.edit': ['provider', 'admin'],

  // 관리자 권한
  'provider.verify': ['admin'],
  'booking.view_all': ['admin'],
  'statistics.view': ['admin'],
}
```

### 전화번호 인증 (시니어 특화)

```typescript
// lib/phone-auth.ts
import { supabase } from './auth-config'

export async function sendVerificationCode(phoneNumber: string) {
  // SMS 인증 코드 발송 (Supabase + 알리고/카카오 알림톡)
  const code = Math.random().toString().slice(2, 8)

  await supabase.from('verification_codes').insert({
    phone_number: phoneNumber,
    code: code,
    expires_at: new Date(Date.now() + 3 * 60 * 1000), // 3분
  })

  // SMS 발송 로직
  await sendSMS(phoneNumber, `[시니어케어] 인증번호: ${code}`)
}

// 큰 버튼, 큰 글씨 UI
export function PhoneAuthForm() {
  return (
    <div className="space-y-6">
      <input
        type="tel"
        className="text-2xl p-6 w-full border-4 rounded-2xl"
        placeholder="010-1234-5678"
      />
      <button className="w-full bg-blue-600 text-white text-2xl p-6 rounded-2xl font-bold">
        인증번호 받기
      </button>
    </div>
  )
}
```

---

## 💳 토스페이먼츠 결제 통합

### 결제 플로우

```typescript
// lib/payment.ts
import { loadTossPayments } from '@tosspayments/payment-sdk'

export async function initiatePayment({
  bookingId,
  amount,
  orderName,
  customerName,
  customerPhone,
}: PaymentParams) {
  const tossPayments = await loadTossPayments(
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!
  )

  return tossPayments.requestPayment('카드', {
    amount,
    orderId: bookingId,
    orderName,
    successUrl: `${window.location.origin}/payment/success`,
    failUrl: `${window.location.origin}/payment/fail`,
    customerName,
    customerMobilePhone: customerPhone,
  })
}

// 결제 성공 처리
export async function handlePaymentSuccess(paymentKey: string, orderId: string, amount: number) {
  // 1. 토스 서버에 결제 승인 요청
  const response = await fetch('/api/payment/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  })

  // 2. DB 업데이트
  await supabase
    .from('bookings')
    .update({
      payment_status: 'paid',
      payment_id: paymentKey,
    })
    .eq('id', orderId)

  // 3. 알림 발송
  await sendBookingConfirmation(orderId)
}
```

---

## 📱 UI/UX 시니어 최적화

### 디자인 가이드라인

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      fontSize: {
        'senior-xs': '18px',   // 일반 small
        'senior-sm': '20px',   // 일반 base
        'senior-base': '24px', // 기본 텍스트
        'senior-lg': '28px',   // 중요 텍스트
        'senior-xl': '32px',   // 제목
        'senior-2xl': '40px',  // 큰 제목
      },
      spacing: {
        'senior-btn': '20px',  // 버튼 패딩
      },
      colors: {
        'senior-primary': '#4A90E2',   // 명확한 파란색
        'senior-success': '#7ED321',   // 성공 (녹색)
        'senior-warning': '#F5A623',   // 주의 (주황)
        'senior-danger': '#D0021B',    // 위험 (빨강)
      },
    },
  },
}

// components/SeniorButton.tsx
export function SeniorButton({ children, ...props }: ButtonProps) {
  return (
    <button
      className={`
        text-senior-lg font-bold
        px-senior-btn py-senior-btn
        min-h-[80px] min-w-[200px]
        rounded-2xl
        shadow-lg
        active:scale-95
        transition-all
      `}
      {...props}
    >
      {children}
    </button>
  )
}
```

### 접근성 기능

```typescript
// 음성 안내 (선택 사항)
import { useSpeechSynthesis } from 'react-speech-kit'

export function VoiceGuideButton({ text, action }: Props) {
  const { speak } = useSpeechSynthesis()

  const handleClick = () => {
    speak({ text: `${text} 버튼을 눌렀습니다` })
    action()
  }

  return (
    <SeniorButton onClick={handleClick}>
      🔊 {text}
    </SeniorButton>
  )
}

// 간편 모드 / 상세 모드 토글
export function ViewModeToggle() {
  const [mode, setMode] = useState<'simple' | 'detailed'>('simple')

  return mode === 'simple' ? (
    <SimpleBookingFlow />  // 3단계 간소화
  ) : (
    <DetailedBookingFlow /> // 전체 옵션
  )
}
```

---

## 🚀 서비스 확장 로드맵

### Phase 1: MVP (1-2개월)
- ✅ 재활 PT 서비스
- ✅ 기본 예약 시스템
- ✅ 토스페이먼츠 결제
- ✅ 리뷰 시스템

### Phase 2: 서비스 확장 (3-4개월)
- 🔄 이동 지원 서비스
  - 병원 동행
  - 외출 보조
  - 휠체어 택시 연계

- 🛁 목욕 케어
  - 방문 목욕 서비스
  - 위생 관리

- 💊 약 복용 관리
  - 복약 알림
  - 약 배달 서비스

### Phase 3: 플랫폼 고도화 (5-6개월)
- 📊 건강 데이터 관리
  - 혈압, 혈당 기록
  - 운동 기록 추적
  - 건강 리포트 생성

- 🤝 케어 패키지
  - 종합 케어 플랜
  - 정기 구독 서비스
  - 가족 케어 패키지

### Phase 4: B2B 확장 (6개월+)
- 🏥 기관 연계
  - 요양원 B2B
  - 병원 퇴원 환자 연계
  - 지자체 복지 서비스 연동

- 🏢 기업 복지
  - 임직원 부모 케어
  - 복지 포인트 연동

---

## 🎯 예약 시스템 전략: 투 트랙 모델

### 핵심 철학

시니어 케어 플랫폼의 성공은 **공정한 기회 분배**, **가격 경쟁력**, **신뢰 구축**에 달려있습니다. 이를 위해 두 가지 예약 방식을 제공합니다.

---

### 📋 지정 예약 (Direct Booking)

**개념**: 고객이 원하는 트레이너를 직접 선택하여 예약

**특징**:
- 💰 **가격**: 기본가 × 1.3 (30% 프리미엄)
- 👤 **선택권**: 고객이 트레이너 직접 선택
- ⚡ **처리**: 즉시 예약 요청
- 🎯 **대상**: 특정 트레이너를 원하는 고객, 브랜드 선호 고객

**사용 시나리오**:
```
1. 리뷰를 보고 마음에 드는 트레이너 발견
2. 지인 추천으로 특정 트레이너 지정
3. 이전에 만족했던 트레이너 재예약
4. 성별/연령대 등 개인 선호도가 명확한 경우
```

**장점**:
- ✅ 고객: 원하는 트레이너 확실하게 선택 가능
- ✅ 트레이너: 높은 수익성 (30% 프리미엄)
- ✅ 플랫폼: 프리미엄 수수료로 높은 마진 확보

---

### 🤖 추천 예약 (Recommended Booking)

**개념**: 관리자가 고객 요구사항에 최적화된 트레이너를 매칭

**특징**:
- 💰 **가격**: 기본가 (추가 비용 없음, 30% 저렴)
- 🎯 **매칭**: 관리자가 AI 점수 알고리즘으로 최적 트레이너 선정
- 📊 **투명성**: 매칭 근거 명시 (점수 + 이유)
- 🌟 **대상**: 가격 민감 고객, 선택이 어려운 고객, 플랫폼 신뢰 고객

**매칭 알고리즘** (점수 기반) - **Day 2 구현 완료** ✅:
```typescript
총점 = 전문성 점수 + 부하 분산 점수 + 가격 점수 + 경력 점수

1. 전문성 점수 (최대 75점)
   - 서비스 타입 일치: 30점 (방문/센터)
   - 전문분야 매칭: 20점/개 (뇌졸중, 관절염 등)
   - 서비스 지역 일치: 25점 (거리 기반)

2. 부하 분산 점수 (최대 20점) 🆕 **구현 완료**
   - 트레이너별 미래 예약 건수 집계 (pending + confirmed)
   - 0건: 20점 + "현재 예약 없음"
   - 1-2건: 15점 + "예약 X건 (여유)"
   - 3-4건: 10점 + "예약 X건 (보통)"
   - 5-6건: 5점 + "예약 X건 (많음)"
   - 7+건: 0점 + "예약 X건 (과부하)"
   - 목적: 공평한 예약 분배, 신규 트레이너 기회 제공

3. 가격 점수 (최대 15점) 🆕 **구현 완료**
   - 예산 내 (≤ ₩100,000): 15 - (시급/100000) * 15
   - 예산 초과: 0점 (기본 필터링됨)
   - Admin UI에 예산 필터 토글 제공
   - 목적: 고객 예산 준수, 가격 경쟁력

4. 경력 점수 (최대 10점)
   - 경력 연수: 2점/년 (최대 10점)
   - 자격증: 3점/개

**총점 범위**: 0점 ~ 140점+ (전문분야 개수에 따라 더 높을 수 있음)

**구현 상태**: ✅ 완전 구현 완료 (2025-10-03)
```

**사용 시나리오**:
```
1. 재활 프로그램이 처음이라 누구를 선택해야 할지 모름
2. 가격이 부담스러워 저렴한 옵션을 원함
3. 전문가의 추천을 신뢰함
4. 여러 트레이너를 비교하는 것이 피곤함
```

**장점**:
- ✅ 고객: 30% 저렴, 전문가 큐레이션, 선택 피로 감소
- ✅ 트레이너: 안정적인 예약 기회, 신규 고객 유입
- ✅ 플랫폼: 시장 확대, 생태계 건강성 유지

---

### 🎯 추천 예약의 3가지 전략적 목표

#### 1. **공정한 기회 분배** (Fair Distribution)

**문제 인식**:
```
스타 트레이너 쏠림 현상
  → 신규 트레이너 예약 0건
  → 이탈 증가
  → 공급자 풀 감소
  → 플랫폼 경쟁력 약화
```

**솔루션**:
- 🎯 기회 균등 점수: 예약이 적은 트레이너 우선 추천
- 🎯 신규 가산점: 첫 90일 동안 15점 추가
- 🎯 실력 있지만 인지도 낮은 중견 트레이너 육성
- 🎯 다양한 트레이너 풀 유지로 서비스 안정성 확보

**기대 효과**:
```
예약 분산 → 트레이너 만족도 ↑ → 이탈률 ↓ → 공급 안정화
```

---

#### 2. **가격 경쟁력** (Cost Efficiency)

**문제 인식**:
```
시니어 케어 시장의 특성
  - 노인 인구 대부분 고정 수입 (연금)
  - 장기적 서비스 필요 (월 8-12회)
  - 가격 민감도 매우 높음
  - 30% 차이가 구매 결정에 결정적
```

**솔루션**:
- 💰 추천 예약: 기본가 (50,000원)
- 💰 지정 예약: 기본가 × 1.3 (65,000원)
- 💰 월 8회 기준: 40만원 vs 52만원 (12만원 차이)

**Win-Win 구조**:
```
고객:
  - 30% 저렴한 가격으로 접근성 향상
  - 장기 이용 시 부담 대폭 감소

트레이너:
  - 단가는 낮지만 예약 기회 증가로 상쇄
  - 안정적인 수입 흐름 확보
  - 신규 고객 확보 기회

플랫폼:
  - 가격 장벽 완화로 시장 확대
  - 고객 유입 증가
  - 장기 고객 확보 (LTV 증가)
```

---

#### 3. **의사결정 지원** (Decision Support)

**문제 인식**:
```
선택 피로 (Choice Overload)
  - 트레이너 100명 중 1명 선택
  - 각 트레이너의 전문성 평가 어려움
  - 잘못된 선택에 대한 두려움
  - 결과: 예약 포기 또는 무작위 선택
```

**솔루션**:
- 🎯 전문가 큐레이션: 관리자가 5-10명으로 좁혀서 제시
- 🎯 매칭 근거 투명 공개: 왜 이 트레이너인지 명확히 설명
- 🎯 플랫폼 보증: "추천"이라는 신뢰 신호
- 🎯 실패 시 책임 공유: 재매칭 무료 제공

**고객 심리**:
```
"내가 직접 고르면 불안하지만,
 전문가가 추천해주면 안심이 돼요"

"어차피 누가 좋은지 모르겠으니,
 싸고 전문가가 골라주면 더 좋죠"
```

---

### 📊 투명성 강화: 매칭 근거 공개

고객이 "왜 이 트레이너인가?"를 이해할 수 있도록 점수와 이유를 명시:

```tsx
// 실제 구현된 UI (Day 2)
<MatchReasonCard>
  <h3>💡 이 트레이너를 추천한 이유</h3>

  <div className="space-y-2">
    <ScoreItem>
      ✅ 요청하신 '뇌졸중 재활' 전문가 (20점)
    </ScoreItem>
    <ScoreItem>
      ✅ 서비스 지역 일치: 강남구 (25점)
    </ScoreItem>
    <ScoreItem>
      ✅ 10년 경력의 물리치료사 (10점)
    </ScoreItem>
    <ScoreItem>
      ✅ 예약 2건 (여유) - 신규 고객에게 집중 가능 (15점)
    </ScoreItem>
    <ScoreItem>
      💰 시급 ₩80,000 - 예산 내 (12점)
    </ScoreItem>
    <ScoreItem>
      ⭐ 평점 4.8/5.0 (48개 리뷰)
    </ScoreItem>
  </div>

  <p className="text-lg font-bold mt-4">
    총 82점 / 최고 점수 트레이너
  </p>

  <p className="text-sm text-muted-foreground mt-2">
    💰 지정 예약 대비 30% 저렴 (15,000원 절약)
  </p>

  <Badge variant="outline" className="mt-2">
    예산 범위 내 (₩100,000 이하)
  </Badge>
</MatchReasonCard>
```

---

### 🚀 향후 고도화 방안

#### 1. 고객 선호도 학습 (AI 개인화)

```typescript
// 2회차 이상 추천 예약 시 학습 데이터 활용
interface CustomerPreference {
  preferred_trainer_gender?: 'male' | 'female'
  preferred_age_range?: [number, number]
  preferred_communication_style?: 'formal' | 'casual'
  preferred_specialties: string[]
  satisfaction_history: {
    trainer_id: string
    rating: number
    booking_count: number
  }[]
}

// 점수 알고리즘에 반영
function calculatePersonalizedScore(trainer, customer) {
  let score = calculateBaseScore(trainer)

  // 과거 만족도가 높았던 트레이너 특성 반영
  const preferences = analyzeCustomerHistory(customer)

  if (preferences.preferred_trainer_gender === trainer.gender) {
    score += 10
  }

  // 비슷한 트레이너와 과거 만족도가 높았다면 가점
  const similarityBonus = calculateSimilarityScore(
    trainer,
    preferences.satisfaction_history
  )
  score += similarityBonus

  return score
}
```

#### 2. 트레이너 전용 혜택

**추천 예약 인센티브 제공**으로 적극적 참여 유도:

```yaml
트레이너 혜택:
  수수료 할인:
    - 추천 예약: 플랫폼 수수료 12% (일반 15% 대비 3% 할인)
    - 지정 예약: 플랫폼 수수료 15%

  배지 시스템:
    - "추천 전문가" 배지 (추천 예약 만족도 4.5+ 유지)
    - 프로필 상단 노출 (검색 가시성 증가)

  성과 보너스:
    - 추천 예약 월 20건 이상: 다음 달 모든 예약 수수료 10%
```

#### 3. 자동 매칭 시스템 (장기 목표)

```
현재: 관리자 수동 매칭
  ↓
중기: AI 추천 + 관리자 승인
  ↓
장기: 완전 자동 매칭 (관리자는 예외 케이스만)
```

**머신러닝 적용**:
- 과거 매칭 성공률 데이터 학습
- 고객 만족도 예측 모델
- 실시간 자동 매칭 (응답 시간 < 1분)

---

### 📈 기대 효과

#### 비즈니스 성과

```
시장 확대:
  - 가격 민감 고객 유입 (+40%)
  - 첫 이용 고객 전환율 증가 (+25%)

생태계 건강:
  - 트레이너 이탈률 감소 (-30%)
  - 신규 트레이너 활성화율 증가 (+50%)

고객 만족:
  - 선택 피로 감소
  - 플랫폼 신뢰도 증가
  - 재예약률 증가 (+20%)
```

#### 차별화 요소

```
경쟁사 대비 우위:
  ✅ 가격 경쟁력: 30% 저렴한 옵션 제공
  ✅ 큐레이션: 전문가 매칭으로 신뢰 확보
  ✅ 공정성: 신규 트레이너 육성으로 지속가능성
  ✅ 투명성: 매칭 근거 공개로 신뢰 구축
```

**시니어 케어 시장 특성과 완벽한 적합성**:
- 신뢰 중요 → 플랫폼 추천이 큰 의미
- 가격 민감 → 30% 할인이 결정적
- 전문성 평가 어려움 → 큐레이션 가치 높음

---

### 🎯 핵심 요약

**추천 예약 시스템의 본질**:
> "단순한 할인 옵션이 아니라,
> **플랫폼 생태계를 건강하게 만드는 핵심 전략**"

**3가지 축**:
1. 🤝 **공정성**: 모든 트레이너에게 공평한 기회 제공
2. 💰 **경제성**: 고객에게 합리적인 가격 제시
3. 🎯 **편의성**: 선택 부담을 덜어주는 전문가 큐레이션

**Win-Win-Win 구조**:
- 고객: 저렴 + 전문가 추천 + 선택 간편
- 트레이너: 안정적 예약 기회 + 신규 고객 확보
- 플랫폼: 시장 확대 + 생태계 건강 + 장기 성장

---

## 📊 비즈니스 모델

### 수익 구조

1. **수수료 모델** (추천)
   - 거래액의 15-20% 플랫폼 수수료
   - 공급자: 80-85%
   - 플랫폼: 15-20%

2. **구독 모델** (공급자)
   - 무료 플랜: 월 5건까지
   - 프로 플랜: 월 50,000원 (무제한)
   - 엔터프라이즈: 협의

3. **광고 모델**
   - 프리미엄 배치
   - 검색 상단 노출

### 초기 목표
- **6개월 내**: MAU 1,000명, 거래액 월 5,000만원
- **1년 내**: MAU 5,000명, 거래액 월 2억원
- **공급자**: 100명 확보

---

## 🛠️ 기술 스택 정리

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS (시니어 최적화)
- React Hook Form
- Zustand (상태 관리)

### Backend & Database
- Supabase (Auth, Database, Realtime)
- PostgreSQL (RLS 활성화)

### CMS
- Sanity Studio (멀티 사이트)

### 외부 서비스
- 토스페이먼츠 (결제)
- 카카오 / 네이버 / 구글 (소셜 로그인)
- 알리고 / 카카오 알림톡 (SMS/알림)
- 카카오맵 (위치)

### 배포
- Vercel (Next.js)
- Supabase Cloud
- Sanity Cloud

---

## 📋 다음 단계

1. ✅ Sanity 스키마 생성 (재활 프로그램, 공급자 프로필)
2. ✅ Supabase 테이블 생성 (사용자, 예약, 리뷰)
3. ✅ 인증 시스템 구현 (카카오/네이버/구글/전화번호)
4. ✅ 예약 시스템 구현
5. ✅ 결제 시스템 통합 (토스페이먼츠)
6. ✅ 시니어 최적화 UI 구현

---

**바로 시작할까요? 어떤 부분부터 구현하시겠습니까?**
1. Sanity 스키마 생성
2. Supabase 데이터베이스 설계
3. 웹사이트 프로젝트 셋업
