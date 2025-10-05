# Database Schema Reference

Senior Care MVP 프로젝트의 데이터베이스 스키마 및 네이밍 규칙 문서입니다.

## 목차
- [테이블 관계도](#테이블-관계도)
- [ID 참조 규칙](#id-참조-규칙)
- [주요 테이블 구조](#주요-테이블-구조)
- [Enum 타입](#enum-타입)
- [네이밍 컨벤션](#네이밍-컨벤션)

---

## 테이블 관계도

```
auth.users (Supabase Auth)
    ↓ id
profiles (사용자 기본 정보)
    ↓ id (= auth.users.id)
    ├─→ customers (고객 상세 정보)
    │       ↓ id
    │   bookings (예약)
    │       ↓ trainer_id
    └─→ trainers (트레이너 상세 정보)
            ↓ id
        bookings (예약)
```

### 핵심 관계

```typescript
// 1단계: 인증
auth.users.id  → 사용자 UUID

// 2단계: 프로필
profiles.id = auth.users.id
profiles.user_type = 'customer' | 'trainer'

// 3단계: 역할별 테이블
customers.profile_id = profiles.id  // user_type='customer'
trainers.profile_id = profiles.id   // user_type='trainer'

// 4단계: 예약
bookings.customer_id = customers.id  // ⚠️ profiles.id가 아님!
bookings.trainer_id = trainers.id    // ⚠️ profiles.id가 아님!
```

---

## ID 참조 규칙

### ⚠️ 자주 하는 실수

```typescript
// ❌ 잘못된 패턴
const { data: { user } } = await supabase.auth.getUser()

// 틀림: bookings는 customers.id를 참조
await supabase
  .from('bookings')
  .select('*')
  .eq('customer_id', user.id)  // user.id는 profiles.id

// ✅ 올바른 패턴
const { data: { user } } = await supabase.auth.getUser()

// 1. customers 테이블에서 customer.id 조회
const { data: customer } = await supabase
  .from('customers')
  .select('id')
  .eq('profile_id', user.id)
  .single()

// 2. customer.id로 예약 조회
await supabase
  .from('bookings')
  .select('*')
  .eq('customer_id', customer.id)
```

### ID 변환 체인

```typescript
// Auth User ID → Profile ID → Customer/Trainer ID
auth.users.id
  → profiles.id (동일한 값)
    → customers.profile_id로 조회 → customers.id 획득
    → trainers.profile_id로 조회 → trainers.id 획득
```

---

## 주요 테이블 구조

### 1. profiles (사용자 기본 정보)

```sql
profiles
├── id: UUID (PK, = auth.users.id)
├── email: TEXT
├── full_name: TEXT
├── phone: TEXT
├── avatar_url: TEXT
├── user_type: TEXT ('customer' | 'trainer')  ⭐
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

-- UNIQUE 제약 조건 없음 (id가 PK)
```

**용도**:
- 모든 사용자 공통 정보
- user_type으로 역할 구분

**접근 방법**:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()
```

---

### 2. customers (고객 상세 정보)

```sql
customers
├── id: UUID (PK)
├── profile_id: UUID (FK → profiles.id, UNIQUE) ⭐
├── age: INTEGER
├── gender: TEXT
├── address: TEXT
├── address_detail: TEXT
├── emergency_contact: TEXT
├── emergency_phone: TEXT
├── medical_conditions: TEXT[]
├── mobility_level: TEXT
├── notes: TEXT
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

-- ⚠️ UNIQUE 제약: profile_id
-- 한 명의 사용자는 하나의 customer 레코드만 가능
```

**용도**:
- profiles.user_type = 'customer'인 사용자의 추가 정보
- 예약 시스템에서 customer_id로 참조

**접근 방법**:
```typescript
// profile_id로 조회
const { data: customer } = await supabase
  .from('customers')
  .select('*')
  .eq('profile_id', user.id)
  .single()

// customer.id 사용
const customerId = customer.id
```

---

### 3. trainers (트레이너 상세 정보)

```sql
trainers
├── id: UUID (PK)
├── profile_id: UUID (FK → profiles.id, UNIQUE) ⭐
├── bio: TEXT
├── specialties: TEXT[]
├── certifications: TEXT[]
├── years_experience: INTEGER
├── rating: DECIMAL(3,2)
├── total_reviews: INTEGER
├── hourly_rate: DECIMAL(10,2)
├── home_visit_available: BOOLEAN
├── center_visit_available: BOOLEAN
├── center_address: TEXT
├── center_name: TEXT
├── service_areas: TEXT[]
├── is_verified: BOOLEAN
├── is_active: BOOLEAN
├── max_group_size: INTEGER
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

-- ⚠️ UNIQUE 제약: profile_id
-- 한 명의 사용자는 하나의 trainer 레코드만 가능
```

**용도**:
- profiles.user_type = 'trainer'인 사용자의 추가 정보
- 예약 시스템에서 trainer_id로 참조

**접근 방법**:
```typescript
// profile_id로 조회
const { data: trainer } = await supabase
  .from('trainers')
  .select('*')
  .eq('profile_id', user.id)
  .single()

// trainer.id 사용
const trainerId = trainer.id
```

---

### 4. bookings (예약)

```sql
bookings
├── id: UUID (PK)
├── customer_id: UUID (FK → customers.id) ⚠️
├── trainer_id: UUID (FK → trainers.id, NULLABLE) ⚠️ ✨ 추천 예약은 NULL
├── booking_type: booking_type ENUM ('direct', 'recommended') ✨ NEW
├── price_multiplier: DECIMAL(3,2) DEFAULT 1.00 ✨ NEW
├── service_type: TEXT ('home_visit' | 'center_visit')
├── group_size: INTEGER
├── booking_date: DATE ⭐
├── start_time: TIME ⭐
├── end_time: TIME ⭐
├── duration_minutes: INTEGER
├── price_per_person: DECIMAL(10,2)
├── total_price: DECIMAL(10,2)
├── customer_notes: TEXT
├── trainer_notes: TEXT
├── status: TEXT (enum)
├── admin_matched_at: TIMESTAMPTZ ✨ NEW (추천 예약 매칭 시각)
├── admin_matched_by: UUID (FK → profiles.id) ✨ NEW
├── cancellation_reason: TEXT
├── cancelled_by: UUID
├── cancelled_at: TIMESTAMPTZ
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

-- ⚠️ 주의: scheduled_at 필드 없음!
-- booking_date + start_time 조합 사용
```

**중요 포인트**:
- `customer_id`는 `customers.id` (profiles.id 아님!)
- `trainer_id`는 `trainers.id` (profiles.id 아님!)
  - ✨ **추천 예약의 경우 초기에 NULL, 관리자 매칭 후 설정됨**
- 날짜/시간은 `booking_date`, `start_time`, `end_time` 분리
- ✨ **예약 타입**:
  - `direct`: 지정 예약 (고객이 트레이너 선택, +30% 비용)
  - `recommended`: 추천 예약 (관리자 매칭, 기본 비용)

**예약 조회 패턴**:
```typescript
// 1. customer.id 먼저 조회
const { data: customer } = await supabase
  .from('customers')
  .select('id')
  .eq('profile_id', user.id)
  .single()

// 2. bookings 조회
const { data: bookings } = await supabase
  .from('bookings')
  .select(`
    *,
    trainer:trainers(
      id,
      profiles!trainers_profile_id_fkey(
        full_name,
        avatar_url
      )
    )
  `)
  .eq('customer_id', customer.id)
  .order('booking_date', { ascending: false })
```

---

### 5. notifications (알림)

```sql
notifications
├── id: UUID (PK)
├── user_id: UUID (FK → auth.users.id)
├── type: TEXT (enum)
├── title: TEXT
├── message: TEXT
├── link: TEXT (nullable) ⭐
├── is_read: BOOLEAN (DEFAULT false)
├── read_at: TIMESTAMPTZ
└── created_at: TIMESTAMPTZ

-- ⚠️ link 컬럼: related_id가 아닌 link 사용
-- 예약 상세 페이지 URL 등을 저장 (예: /customer/bookings/{id})
```

**용도**:
- 사용자별 알림 메시지
- 예약 상태 변경, 매칭 완료 등의 이벤트 알림
- link를 통해 관련 페이지로 직접 이동

**접근 방법**:
```typescript
// 현재 사용자의 알림 조회
const { data: notifications } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })

// 알림 생성
const { data } = await supabase
  .from('notifications')
  .insert({
    user_id: userId,
    title: '트레이너 매칭 완료',
    message: '김재활 트레이너가 배정되었습니다.',
    type: 'booking_matched',
    link: '/customer/bookings/abc-123'
  })
```

---

## Enum 타입

### user_type (profiles)
```typescript
type UserType = 'customer' | 'trainer' | 'admin'
```

### booking_type (bookings) ✨ NEW
```typescript
type BookingType =
  | 'direct'       // 지정 예약 (고객이 트레이너 선택, +30% 비용)
  | 'recommended'  // 추천 예약 (관리자 매칭, 기본 비용)
```

**가격 배수**:
```typescript
// booking_type → price_multiplier
'direct'      → 1.3   // 30% 추가
'recommended' → 1.0   // 기본가
```

### service_type (bookings)
```typescript
type ServiceType = 'home_visit' | 'center_visit'
```

**매핑 규칙**:
```typescript
// 폼 값 → DB 값
'home' → 'home_visit'
'center' → 'center_visit'
```

### notification_type (notifications)
```typescript
type NotificationType =
  | 'booking_confirmed'  // 예약 승인
  | 'booking_cancelled'  // 예약 취소
  | 'booking_completed'  // 서비스 완료
  | 'booking_pending'    // 새 예약 요청 (추천 예약 생성 시 어드민 알림 포함)
  | 'booking_rejected'   // 예약 거절
  | 'booking_matched'    // 트레이너 매칭 완료 (추천 예약)
  | 'system'             // 시스템 알림
```

**Usage Note**: `booking_pending`은 다음 두 경우에 사용됩니다:
1. 고객이 새로운 추천 예약을 생성했을 때 → 어드민에게 알림
2. 일반적인 예약 승인 대기 상태

*Updated: 2025-10-05*

### booking_status
```typescript
type BookingStatus =
  | 'pending'      // 승인 대기 (추천 예약의 경우 매칭 대기)
  | 'confirmed'    // 확정
  | 'in_progress'  // 진행 중
  | 'completed'    // 완료
  | 'cancelled'    // 취소 (고객 취소 또는 트레이너 거절)
  | 'no_show'      // 노쇼
```

**CHECK 제약 조건**:
```sql
CHECK (status = ANY (ARRAY[
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
]))
```

**주의**:
- `'rejected'`는 데이터베이스에 없음! 트레이너 거절 시 `'cancelled'` 사용
- 코드에서는 `BOOKING_STATUS.CANCELLED` 사용

### gender (customers)
```typescript
type Gender = 'male' | 'female' | 'other'
```

### mobility_level (customers)
```typescript
type MobilityLevel =
  | 'independent'  // 독립적
  | 'assisted'     // 보조 필요
  | 'wheelchair'   // 휠체어
  | 'bedridden'    // 와상
```

---

## 네이밍 컨벤션

### 테이블명
- **소문자, 복수형**: `customers`, `trainers`, `bookings`
- **snake_case**: `service_areas`, `is_verified`

### 컬럼명
- **snake_case**: `full_name`, `hourly_rate`, `created_at`
- **boolean 필드**: `is_` 접두사 (`is_active`, `is_verified`)
- **날짜/시간**: `_at` 접미사 (`created_at`, `cancelled_at`)

### 외래키
- **참조 테이블 + _id**: `customer_id`, `trainer_id`, `profile_id`
- **자기 참조 시 명시적 이름**: `cancelled_by` (user_id 대신)

### 배열 필드
- **복수형**: `specialties`, `certifications`, `service_areas`

---

## 자주 사용하는 쿼리 패턴

### 1. 현재 사용자 정보 조회
```typescript
const { data: { user } } = await supabase.auth.getUser()
// user.id는 profiles.id와 동일
```

### 2. 프로필 + 역할 정보 조회
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()

if (profile.user_type === 'customer') {
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('profile_id', user.id)
    .single()
} else if (profile.user_type === 'trainer') {
  const { data: trainer } = await supabase
    .from('trainers')
    .select('*')
    .eq('profile_id', user.id)
    .single()
}
```

### 3. 예약 생성
```typescript
// 1. customer.id 조회
const { data: customer } = await supabase
  .from('customers')
  .select('id')
  .eq('profile_id', user.id)
  .single()

// 2. 예약 생성
const { data: booking } = await supabase
  .from('bookings')
  .insert({
    customer_id: customer.id,  // ⚠️ user.id 아님!
    trainer_id: trainerId,
    service_type: 'home_visit',
    booking_date: '2025-01-15',
    start_time: '14:00:00',
    end_time: '15:00:00',
    // ...
  })
```

### 4. 트레이너 목록 조회 (프로필 정보 포함)
```typescript
const { data: trainers } = await supabase
  .from('trainers')
  .select(`
    *,
    profiles!trainers_profile_id_fkey(
      full_name,
      avatar_url,
      phone
    )
  `)
  .eq('is_active', true)
```

---

## 트리거 및 자동화

### 1. 신규 사용자 자동 생성 (handle_new_user)

**트리거**: `on_auth_user_created`
**함수**: `handle_new_user()`
**실행 시점**: `auth.users`에 INSERT 발생 시

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. profiles 테이블에 레코드 생성
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'user_type', 'customer')
  );

  -- 2. user_type이 'customer'면 customers 테이블에도 생성
  IF COALESCE(new.raw_user_meta_data->>'user_type', 'customer') = 'customer' THEN
    INSERT INTO public.customers (profile_id)
    VALUES (new.id);
  END IF;

  -- 3. user_type이 'trainer'면 trainers 테이블에도 생성
  IF COALESCE(new.raw_user_meta_data->>'user_type', 'customer') = 'trainer' THEN
    INSERT INTO public.trainers (profile_id)
    VALUES (new.id);
  END IF;

  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**결과**:
- 회원가입 시 자동으로 profiles, customers/trainers 레코드 생성
- 수동으로 INSERT 불필요
- 회원가입 옵션에 `user_type` 전달 가능

---

## RLS (Row Level Security) 정책

### profiles 테이블
**RLS 활성화**: ✅

```sql
-- 모든 사용자가 자신의 프로필만 조회
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO public
USING (auth.uid() = id);

-- 모든 사용자가 자신의 프로필만 수정
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO public
USING (auth.uid() = id);
```

---

### customers 테이블
**RLS 활성화**: ✅

```sql
-- 고객과 트레이너 모두 customers 테이블 조회 가능
CREATE POLICY "Users can view customers"
ON customers FOR SELECT
TO public
USING (
  -- 자신의 customer 레코드는 볼 수 있음
  profile_id = auth.uid()
  OR
  -- 트레이너는 모든 customers를 볼 수 있음
  EXISTS (
    SELECT 1 FROM trainers
    WHERE trainers.profile_id = auth.uid()
  )
);

-- 고객은 자신의 정보만 INSERT
CREATE POLICY "Customers can insert own data"
ON customers FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.id = customers.profile_id
  )
);

-- 고객은 자신의 정보만 UPDATE
CREATE POLICY "Customers can update own data"
ON customers FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.id = customers.profile_id
  )
);
```

**중요**:
- 트레이너가 예약된 고객 정보를 조회할 수 있도록 트레이너에게 모든 customers 조회 권한 부여
- 실제로는 자신의 예약에 연결된 고객만 쿼리되므로 보안 문제 없음

---

### trainers 테이블
**RLS 활성화**: ✅

```sql
-- 모든 사용자가 활성화된 트레이너 조회 가능
CREATE POLICY "Anyone can view active trainers"
ON trainers FOR SELECT
TO public
USING (is_active = true);

-- 트레이너는 자신의 정보만 수정
CREATE POLICY "Trainers can update own data"
ON trainers FOR UPDATE
TO public
USING (profile_id = auth.uid());
```

---

### bookings 테이블
**RLS 활성화**: ✅

```sql
-- 고객은 자신의 예약만 조회
-- 트레이너는 자신의 예약만 조회
CREATE POLICY "Users can view own bookings"
ON bookings FOR SELECT
TO public
USING (
  -- 고객: 자신의 예약
  EXISTS (
    SELECT 1 FROM customers c
    JOIN profiles p ON p.id = c.profile_id
    WHERE p.id = auth.uid()
      AND c.id = bookings.customer_id
  )
  OR
  -- 트레이너: 자신의 예약
  EXISTS (
    SELECT 1 FROM trainers t
    JOIN profiles p ON p.id = t.profile_id
    WHERE p.id = auth.uid()
      AND t.id = bookings.trainer_id
  )
);

-- 고객은 예약 생성 가능
CREATE POLICY "Customers can create bookings"
ON bookings FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM customers c
    JOIN profiles p ON p.id = c.profile_id
    WHERE p.id = auth.uid()
      AND c.id = bookings.customer_id
  )
);

-- 고객은 자신의 예약만 수정 (취소)
CREATE POLICY "Customers can update own bookings"
ON bookings FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM customers c
    JOIN profiles p ON p.id = c.profile_id
    WHERE p.id = auth.uid()
      AND c.id = bookings.customer_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM customers c
    JOIN profiles p ON p.id = c.profile_id
    WHERE p.id = auth.uid()
      AND c.id = bookings.customer_id
  )
);

-- 트레이너는 자신의 예약 상태 업데이트 가능 (승인/거절/완료)
CREATE POLICY "Trainers can update own bookings"
ON bookings FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM trainers t
    JOIN profiles p ON p.id = t.profile_id
    WHERE p.id = auth.uid()
      AND t.id = bookings.trainer_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trainers t
    JOIN profiles p ON p.id = t.profile_id
    WHERE p.id = auth.uid()
      AND t.id = bookings.trainer_id
  )
);
```

**중요**:
- `USING`: 어떤 행을 읽거나 업데이트할 수 있는지 결정 (WHERE 조건과 유사)
- `WITH CHECK`: 업데이트/INSERT 후 데이터가 정책을 만족하는지 확인
- 트레이너의 UPDATE 정책에 `WITH CHECK`가 없으면 업데이트 실패

---

## 마이그레이션 히스토리

### 적용된 마이그레이션
1. `1-tables.sql` - 초기 테이블 생성
2. `20240115_create_notifications.sql` - 알림 시스템
3. `20250104_auto_create_customer.sql` - customer 자동 생성 트리거

### 주요 변경사항
- `customers.profile_id`에 UNIQUE 제약 추가
- `trainers.profile_id`에 UNIQUE 제약 추가
- customer 자동 생성 트리거 설치

---

## 체크리스트

### 예약 생성 시
- [ ] `customer.id` 먼저 조회 (`user.id`로 직접 조회 ❌)
- [ ] `service_type` 매핑 확인 (home → home_visit)
- [ ] `booking_date`, `start_time`, `end_time` 분리
- [ ] `total_price` 계산 (hourly_rate × duration)

### 사용자 역할 전환 시
- [ ] `profiles.user_type` 업데이트
- [ ] 해당 역할 테이블에 레코드 생성 (customers/trainers)
- [ ] UNIQUE 제약으로 중복 방지 확인

### 쿼리 작성 시
- [ ] 필드명 확인 (scheduled_at ❌ → booking_date ✅)
- [ ] ID 참조 확인 (user.id vs customer.id vs trainer.id)
- [ ] enum 값 확인 (폼 값 ≠ DB 값)

---

**마지막 업데이트**: 2025-10-05
**작성자**: Claude Code
**버전**: 2.1
**변경사항**:
- notification_type `booking_pending` 사용처 명시 (어드민 알림 포함)
- notification_settings 테이블 추가 (알림 설정 기능)
