# 🗄️ Supabase 아키텍처 문서

**프로젝트**: Senior Care MVP
**작성일**: 2025-10-02
**최종 업데이트**: 2025-10-07 (Day 7)
**버전**: 2.0
**상태**: ✅ 운영 중

---

## 📋 목차

1. [아키텍처 결정 배경](#아키텍처-결정-배경)
2. [현재 구조](#현재-구조)
3. [데이터베이스 설계](#데이터베이스-설계)
4. [인증 시스템](#인증-시스템)
5. [스토리지 구조](#스토리지-구조)
6. [실시간 기능](#실시간-기능)
7. [보안 정책 (RLS)](#보안-정책-rls)
8. [확장 계획](#확장-계획)
9. [운영 가이드](#운영-가이드)

---

## 🎯 아키텍처 결정 배경

### 선택: 별도 Supabase 프로젝트 (분리) ⭐

**결정 이유**:
1. ✅ **완벽한 격리**: 기존 프로젝트와 100% 분리
2. ✅ **실험적 MVP**: 실패 시 영향 최소화
3. ✅ **독립적 확장**: 성공 시 독립적으로 성장 가능
4. ✅ **리스크 분산**: 장애 격리
5. ✅ **간단한 구조**: RLS 복잡도 낮음

**대안 (통합 프로젝트)**:
- 비용 절감은 가능하지만 RLS 복잡도 증가
- 데이터 격리 어려움
- 확장성 한계
- 장애 시 전체 영향

### 비용 분석

```
현재 (무료 플랜):
- Senior Care Supabase: $0/월
- 500MB 데이터베이스
- 1GB 파일 스토리지
- 무제한 API 요청

성장 후 (Pro 플랜):
- Senior Care Supabase: $25/월
- 8GB 데이터베이스
- 100GB 파일 스토리지
- 무제한 API 요청

→ 매출 발생 시 충분히 감당 가능한 비용
```

---

## 🏗️ 현재 구조

### Supabase 프로젝트 정보

```yaml
프로젝트명: senior-care-mvp
지역: Seoul (ap-northeast-2)
플랜: Free Tier
Database: PostgreSQL 15
API URL: https://xxx.supabase.co
```

### 아키텍처 다이어그램

```
┌─────────────────────────────────────────────┐
│         Senior Care Supabase Project        │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │         Authentication                  │ │
│  │  - Email/Password                       │ │
│  │  - 카카오/네이버/구글 OAuth (준비)      │ │
│  │  - 전화번호 인증 (준비)                 │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │         Database (PostgreSQL)           │ │
│  │                                          │ │
│  │  Core Tables:                            │ │
│  │  ├─ profiles (사용자 기본)              │ │
│  │  ├─ customers (고객 상세)               │ │
│  │  ├─ trainers (트레이너 상세)            │ │
│  │  └─ bookings (예약)                     │ │
│  │                                          │ │
│  │  Feature Tables:                         │ │
│  │  ├─ notifications (알림)                │ │
│  │  ├─ trainer_availability (가용시간)     │ │
│  │  ├─ favorites (즐겨찾기)                │ │
│  │  └─ reviews (리뷰 - 예정)              │ │
│  │                                          │ │
│  │  Settings Tables:                        │ │
│  │  ├─ notification_settings (알림설정)    │ │
│  │  └─ trainer_billing_info (결제정보)     │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │         Storage (Supabase Storage)      │ │
│  │                                          │ │
│  │  Buckets:                                │ │
│  │  ├─ profiles (프로필 사진)              │ │
│  │  ├─ certificates (자격증 - 예정)        │ │
│  │  └─ center-photos (센터 사진 - 예정)   │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │         Realtime (실시간 기능)          │ │
│  │                                          │ │
│  │  ├─ notifications (알림)                │ │
│  │  └─ bookings (예약 상태 - 예정)        │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │         Functions & Triggers            │ │
│  │                                          │ │
│  │  ├─ handle_new_user() (자동 프로필)    │ │
│  │  └─ auto_approve_pending_bookings()     │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## 🗄️ 데이터베이스 설계

### 핵심 설계 원칙

1. **3단계 사용자 모델**:
   ```
   auth.users (인증)
   → profiles (공통 정보)
     → customers / trainers (역할별 상세)
   ```

2. **완벽한 데이터 격리**:
   - RLS (Row Level Security) 정책으로 권한 관리
   - 고객/트레이너/관리자 권한 분리
   - 각 사용자는 자신의 데이터만 접근

3. **확장 가능한 구조**:
   - 예약 타입 (지정/추천)
   - 트레이너 매칭 알고리즘
   - 알림 시스템
   - 리뷰 시스템 (예정)

### 테이블 관계도

```sql
auth.users (Supabase Auth)
    ↓ id
profiles (사용자 기본 정보)
    ↓ id (= auth.users.id)
    ├─→ customers (고객 상세)
    │       ↓ id
    │   bookings (예약)
    │       ↑ customer_id
    │       ↓ trainer_id
    └─→ trainers (트레이너 상세)
            ↓ id
        bookings (예약)
        trainer_availability (가용시간)
        trainer_billing_info (결제정보)
```

### 주요 테이블 (Day 7 기준)

#### 1. profiles (사용자 공통)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  birth_date DATE,  -- Day 6 추가
  user_type TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**특징**:
- auth.users.id와 동일한 id 사용
- user_type으로 역할 구분 (customer/trainer/admin)
- 모든 사용자 공통 정보 저장

#### 2. customers (고객 상세)
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID UNIQUE REFERENCES profiles(id),
  age INTEGER,
  gender TEXT,
  address TEXT,
  address_detail TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  guardian_name TEXT,  -- Day 6 추가
  guardian_phone TEXT,  -- Day 6 추가
  guardian_relationship TEXT,  -- Day 6 추가
  medical_conditions TEXT[],
  mobility_level TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**특징**:
- profile_id에 UNIQUE 제약
- 한 프로필당 하나의 customer 레코드
- 보호자 정보 추가 (Day 6)

#### 3. trainers (트레이너 상세)
```sql
CREATE TABLE trainers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID UNIQUE REFERENCES profiles(id),
  bio TEXT,
  specialties TEXT[],
  certifications TEXT[],
  years_experience INTEGER,
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  hourly_rate DECIMAL(10,2),
  home_visit_available BOOLEAN DEFAULT false,
  center_visit_available BOOLEAN DEFAULT false,
  center_address TEXT,
  center_name TEXT,
  service_areas TEXT[],
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  max_group_size INTEGER DEFAULT 1,  -- Day 7 추가
  bank_name TEXT,  -- Day 7 추가 (결제 정보)
  account_number TEXT,  -- Day 7 추가
  account_holder TEXT,  -- Day 7 추가
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**특징**:
- profile_id에 UNIQUE 제약
- 평점/리뷰 시스템 준비
- 그룹 수업 지원 (max_group_size)
- 결제 정보 내장 (Day 7)

#### 4. bookings (예약)
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  trainer_id UUID REFERENCES trainers(id),  -- 추천예약 시 NULL
  booking_type booking_type_enum DEFAULT 'direct',  -- direct/recommended
  price_multiplier DECIMAL(3,2) DEFAULT 1.0,
  service_type TEXT NOT NULL,  -- home_visit/center_visit
  group_size INTEGER DEFAULT 1,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER,
  price_per_person DECIMAL(10,2),
  total_price DECIMAL(10,2),
  customer_notes TEXT,
  trainer_notes TEXT,
  status booking_status_enum DEFAULT 'pending',
  admin_matched_at TIMESTAMPTZ,  -- 추천예약 매칭 시각
  admin_matched_by UUID REFERENCES profiles(id),
  rejection_reason rejection_reason_enum,  -- Day 4 추가
  rejection_note TEXT,  -- Day 4 추가
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES profiles(id),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**특징**:
- 예약 타입: 지정(direct) / 추천(recommended)
- 추천 예약은 초기에 trainer_id NULL, 관리자 매칭 후 설정
- 거절 사유 추적 (Day 4)
- 가격 배수 (지정: 1.3, 추천: 1.0)

#### 5. notifications (알림)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  type notification_type_enum NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**특징**:
- Supabase Realtime 활성화
- 실시간 알림 업데이트
- 알림 클릭 시 관련 페이지로 이동

#### 6. trainer_availability (가용 시간)
```sql
CREATE TABLE trainer_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID REFERENCES trainers(id),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**특징**:
- 요일별 가용 시간 설정
- 트레이너별 다중 시간 슬롯 지원
- Day 4 구현

#### 7. favorites (즐겨찾기)
```sql
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  trainer_id UUID REFERENCES trainers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, trainer_id)
);
```

**특징**:
- 고객별 즐겨찾기 트레이너
- 중복 방지 (UNIQUE 제약)
- Day 6 구현

#### 8. notification_settings (알림 설정)
```sql
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID UNIQUE REFERENCES trainers(id),
  booking_notifications BOOLEAN DEFAULT true,
  reminder_notifications BOOLEAN DEFAULT true,
  marketing_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**특징**:
- 트레이너별 알림 설정
- 카테고리별 ON/OFF
- Day 7 구현

### Enum 타입

```sql
-- 사용자 타입
CREATE TYPE user_type AS ENUM ('customer', 'trainer', 'admin');

-- 예약 타입
CREATE TYPE booking_type_enum AS ENUM ('direct', 'recommended');

-- 예약 상태
CREATE TYPE booking_status_enum AS ENUM (
  'pending',      -- 승인 대기
  'confirmed',    -- 확정
  'in_progress',  -- 진행 중
  'completed',    -- 완료
  'cancelled',    -- 취소
  'no_show'       -- 노쇼
);

-- 거절 사유
CREATE TYPE rejection_reason_enum AS ENUM (
  'personal_emergency',  -- 개인 사정
  'health_issue',        -- 건강 문제
  'schedule_conflict',   -- 일정 충돌
  'distance_too_far',    -- 거리 문제
  'customer_requirements', -- 고객 요구사항 불일치
  'other'                -- 기타
);

-- 알림 타입
CREATE TYPE notification_type_enum AS ENUM (
  'booking_confirmed',
  'booking_cancelled',
  'booking_completed',
  'booking_pending',
  'booking_rejected',
  'booking_matched',
  'system'
);
```

---

## 🔐 인증 시스템

### 인증 플로우

```typescript
// 1. 회원가입
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      full_name: '홍길동',
      user_type: 'customer'  // or 'trainer'
    }
  }
})

// 2. 자동 프로필 생성 (Trigger)
// - profiles 테이블에 레코드 생성
// - user_type에 따라 customers/trainers 테이블에 레코드 생성

// 3. 로그인
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// 4. 사용자 정보 조회
const { data: { user } } = await supabase.auth.getUser()
// user.id = profiles.id
```

### OAuth 준비 (예정)

```yaml
카카오:
  - Client ID: 설정 필요
  - Redirect URL: /auth/callback

네이버:
  - Client ID: 설정 필요
  - Redirect URL: /auth/callback

구글:
  - Client ID: 설정 필요
  - Redirect URL: /auth/callback
```

---

## 📦 스토리지 구조

### Bucket: profiles (Public)

```yaml
이름: profiles
권한: Public
용도: 사용자 프로필 사진
파일명 패턴: {userId}.{ext}
최대 크기: 5MB
허용 타입: image/jpeg, image/png, image/gif, image/webp
```

**RLS 정책**:
```sql
-- 모든 사용자가 프로필 사진 조회 가능
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'profiles');

-- 본인만 업로드/업데이트/삭제 가능
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profiles'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**업로드 예시**:
```typescript
const file = event.target.files[0]
const fileExt = file.name.split('.').pop()
const fileName = `${userId}.${fileExt}`

const { data, error } = await supabase.storage
  .from('profiles')
  .upload(fileName, file, { upsert: true })
```

### Bucket: certificates (Private - 예정)

```yaml
이름: certificates
권한: Private
용도: 트레이너 자격증 파일
최대 크기: 10MB
허용 타입: image/*, application/pdf
```

---

## ⚡ 실시간 기능

### Realtime 구독

#### 1. 알림 실시간 업데이트

```typescript
const channel = supabase
  .channel('notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('새 알림:', payload.new)
      // UI 업데이트
    }
  )
  .subscribe()
```

**활용**:
- 실시간 알림 드롭다운 업데이트
- 사운드 알림 재생
- 배지 카운트 업데이트

#### 2. 예약 상태 실시간 업데이트 (예정)

```typescript
const channel = supabase
  .channel('bookings')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'bookings',
      filter: `id=eq.${bookingId}`
    },
    (payload) => {
      console.log('예약 상태 변경:', payload.new.status)
      // 예약 상태 트래커 업데이트
    }
  )
  .subscribe()
```

---

## 🛡️ 보안 정책 (RLS)

### RLS 활성화 현황

```sql
-- 모든 테이블에 RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
```

### 주요 RLS 정책

#### profiles
```sql
-- 본인 프로필만 조회/수정
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);
```

#### bookings
```sql
-- 고객: 본인 예약만 조회
CREATE POLICY "Customers can view own bookings"
ON bookings FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM customers WHERE profile_id = auth.uid()
  )
);

-- 트레이너: 본인 예약만 조회
CREATE POLICY "Trainers can view own bookings"
ON bookings FOR SELECT
USING (
  trainer_id IN (
    SELECT id FROM trainers WHERE profile_id = auth.uid()
  )
);

-- 관리자: 모든 예약 조회
CREATE POLICY "Admins can view all bookings"
ON bookings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);
```

#### 특별 정책: trainers 테이블

```sql
-- 활성 트레이너는 모두가 조회 가능 (공개 목록)
CREATE POLICY "Anyone can view active trainers"
ON trainers FOR SELECT
USING (is_active = true);

-- 트레이너 본인만 수정 가능
CREATE POLICY "Trainers can update own data"
ON trainers FOR UPDATE
USING (profile_id = auth.uid());
```

**이유**: 트레이너 목록 페이지에서 비로그인 사용자도 조회 가능해야 함

---

## 🔧 Functions & Triggers

### 1. handle_new_user() (자동 프로필 생성)

**트리거**: auth.users INSERT 시 자동 실행

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. profiles 생성
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'user_type', 'customer')
  );

  -- 2. user_type에 따라 customers/trainers 생성
  IF COALESCE(new.raw_user_meta_data->>'user_type', 'customer') = 'customer' THEN
    INSERT INTO public.customers (profile_id) VALUES (new.id);
  ELSIF COALESCE(new.raw_user_meta_data->>'user_type', 'customer') = 'trainer' THEN
    INSERT INTO public.trainers (profile_id) VALUES (new.id);
  END IF;

  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**결과**: 회원가입 시 profiles + customers/trainers 자동 생성

### 2. auto_approve_pending_bookings() (자동 승인)

**용도**: 트레이너 매칭 후 1시간 경과한 예약 자동 승인

```sql
CREATE OR REPLACE FUNCTION auto_approve_pending_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bookings
  SET status = 'confirmed'
  WHERE status = 'pending'
    AND booking_type = 'recommended'
    AND trainer_id IS NOT NULL
    AND admin_matched_at IS NOT NULL
    AND admin_matched_at < NOW() - INTERVAL '1 hour';
END;
$$;
```

**실행**: Vercel Cron (10분마다) 또는 Supabase pg_cron

---

## 🚀 확장 계획

### Phase 1: MVP 완성 (현재 진행 중)

- [x] 기본 인증 시스템
- [x] 예약 시스템 (지정/추천)
- [x] 트레이너 매칭 알고리즘
- [x] 실시간 알림
- [x] 프로필 사진 업로드
- [x] 즐겨찾기 기능
- [ ] 리뷰 시스템
- [ ] 결제 시스템

### Phase 2: 고급 기능

```sql
-- 리뷰 테이블 (예정)
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  customer_id UUID REFERENCES customers(id),
  trainer_id UUID REFERENCES trainers(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 결제 내역 (예정)
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  amount DECIMAL(10,2),
  status TEXT,  -- pending/completed/failed/refunded
  payment_method TEXT,
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Phase 3: 시니어 서비스 확장

```sql
-- Organization 구조 도입 (미래)
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  service_type TEXT,  -- 'rehab', 'food-delivery', 'shopping'
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 하나의 Supabase로 여러 시니어 서비스 관리
```

---

## 📊 운영 가이드

### 일일 체크리스트

- [ ] RLS 정책 위반 로그 확인
- [ ] Realtime 연결 상태 확인
- [ ] Storage 용량 확인
- [ ] Database 크기 모니터링

### 주간 체크리스트

- [ ] 백업 확인
- [ ] 느린 쿼리 분석
- [ ] 인덱스 성능 체크
- [ ] 사용자 증가 추이

### 데이터베이스 백업

```bash
# Supabase CLI 사용
supabase db dump -f backup.sql

# 복원
supabase db reset
psql -h db.xxx.supabase.co -U postgres -d postgres -f backup.sql
```

### 성능 최적화

```sql
-- 자주 사용하는 쿼리 인덱스
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_trainer ON bookings(trainer_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
```

### 모니터링 쿼리

```sql
-- 테이블별 레코드 수
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- 느린 쿼리 찾기
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## 📝 변경 이력

### Day 7 (2025-10-07)
- ✅ `trainers.max_group_size` 추가 (그룹 수업 지원)
- ✅ `trainers.bank_name`, `account_number`, `account_holder` 추가
- ✅ `notification_settings` 테이블 생성
- ✅ 트레이너 설정 페이지 완성

### Day 6 (2025-10-07)
- ✅ `profiles.birth_date` 추가
- ✅ `customers.guardian_*` 필드 추가 (보호자 정보)
- ✅ `favorites` 테이블 생성
- ✅ `profiles` Storage bucket 생성 및 RLS 설정

### Day 5 (2025-10-06)
- ✅ `auto_approve_pending_bookings()` 함수 생성
- ✅ Vercel Cron 자동 승인 시스템

### Day 4 (2025-10-06)
- ✅ `bookings.rejection_reason`, `rejection_note` 추가
- ✅ `trainer_availability` 테이블 생성
- ✅ rejection_reason_enum 타입 생성

### Day 3 (2025-10-05)
- ✅ `notifications` 테이블 Realtime 활성화
- ✅ 실시간 알림 시스템 구현

### Day 2 (2025-10-03)
- ✅ `bookings.booking_type`, `price_multiplier` 추가
- ✅ `bookings.admin_matched_at`, `admin_matched_by` 추가
- ✅ RLS 정책 완전 재구축
- ✅ Admin RLS 정책 추가

### Day 1 (2025-10-02)
- ✅ 초기 테이블 생성
- ✅ handle_new_user() 트리거 설정
- ✅ 기본 RLS 정책 설정

---

**문서 관리자**: Claude Code
**최종 검토**: 2025-10-07
**다음 업데이트 예정**: 리뷰 시스템 구현 시
