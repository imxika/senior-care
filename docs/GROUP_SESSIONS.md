# 그룹 세션 (2:1, 3:1 등) 구현 가이드

## 📋 개요

Senior Care 시스템은 1:1 개인 세션뿐만 아니라 **2:1, 3:1 등 그룹 세션**을 지원합니다.
여러 참가자가 함께 운동하는 세션에서 각 참가자의 정보와 결제를 개별 관리할 수 있습니다.

## 🗄️ 데이터베이스 구조

### 1. `bookings` 테이블 확장

```sql
-- 추가된 컬럼들
max_participants INTEGER DEFAULT 1       -- 최대 참가 인원
current_participants INTEGER DEFAULT 1   -- 현재 참가 인원
session_type TEXT DEFAULT '1:1'         -- '1:1', '2:1', '3:1', 'group'
```

### 2. `booking_participants` 테이블 (새로 생성)

```sql
CREATE TABLE booking_participants (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),

  -- 회원 참가자
  customer_id UUID REFERENCES customers(id) NULLABLE,

  -- 비회원 참가자 정보
  guest_name TEXT,
  guest_phone TEXT,
  guest_email TEXT,
  guest_birth_date DATE,
  guest_gender TEXT,

  -- 결제 정보
  payment_amount DECIMAL NOT NULL,
  payment_status TEXT,
  payment_method TEXT,
  paid_at TIMESTAMPTZ,

  -- 참가자 상태
  is_primary BOOLEAN,           -- 예약 주최자 여부
  attendance_status TEXT,       -- 출석 상태
  notes TEXT                    -- 특이사항
)
```

**핵심 특징:**
- **회원/비회원 동시 지원**: `customer_id`가 있으면 회원, 없으면 비회원
- **분할 결제**: 각 참가자별로 `payment_amount` 개별 관리
- **주최자 표시**: `is_primary = true`인 참가자가 예약 대표자
- **자동 카운트**: 트리거로 `current_participants` 자동 업데이트

## 🔧 구현 파일들

### 1. SQL Migration
📄 `/supabase/13-group-sessions.sql`
- `bookings` 테이블 확장
- `booking_participants` 테이블 생성
- RLS 정책 설정
- 자동 업데이트 트리거
- 기존 데이터 마이그레이션

### 2. React 컴포넌트
📄 `/components/booking-participants-manager.tsx`

**Props:**
```typescript
{
  bookingId?: string              // 예약 ID (수정 시)
  sessionType: '1:1' | '2:1' | '3:1' | 'group'
  maxParticipants: number         // 최대 인원
  totalPrice: number              // 전체 금액
  participants: Participant[]     // 참가자 배열
  onParticipantsChange: (participants) => void
  readOnly?: boolean              // 읽기 전용 모드
}
```

**주요 기능:**
- ✅ 회원 이메일로 검색 및 추가
- ✅ 비회원 수동 정보 입력
- ✅ 참가자별 결제 금액 자동 분배
- ✅ 수동 금액 조정 가능
- ✅ 금액 합계 검증
- ✅ 예약 주최자는 제거 불가

### 3. API 엔드포인트
📄 `/app/api/customers/search/route.ts`

**Endpoint:** `GET /api/customers/search?email={email}`

**Response:**
```json
{
  "customer": {
    "id": "uuid",
    "full_name": "홍길동",
    "email": "hong@example.com",
    "phone": "010-0000-0000"
  }
}
```

**권한:** 관리자, 트레이너만 호출 가능

## 💡 사용 예시

### 예약 생성 시 참가자 관리

```tsx
'use client'

import { useState } from 'react'
import { BookingParticipantsManager } from '@/components/booking-participants-manager'

export function CreateBookingForm() {
  const [sessionType, setSessionType] = useState<'1:1' | '2:1' | '3:1'>('1:1')
  const [participants, setParticipants] = useState([
    {
      id: 'primary',
      customer_id: 'current-customer-id',
      customer_name: '김철수',
      customer_email: 'kim@example.com',
      payment_amount: 80000,
      payment_status: 'pending',
      is_primary: true,
    }
  ])

  const maxParticipants = {
    '1:1': 1,
    '2:1': 2,
    '3:1': 3,
  }[sessionType]

  return (
    <div>
      {/* 세션 타입 선택 */}
      <Select value={sessionType} onValueChange={setSessionType}>
        <SelectItem value="1:1">1:1 개인 세션</SelectItem>
        <SelectItem value="2:1">2:1 듀얼 세션</SelectItem>
        <SelectItem value="3:1">3:1 그룹 세션</SelectItem>
      </Select>

      {/* 참가자 관리 */}
      <BookingParticipantsManager
        sessionType={sessionType}
        maxParticipants={maxParticipants}
        totalPrice={80000}
        participants={participants}
        onParticipantsChange={setParticipants}
      />

      {/* 예약 생성 버튼 */}
      <Button onClick={handleCreateBooking}>
        예약 생성
      </Button>
    </div>
  )
}
```

### 예약 생성 로직

```typescript
async function handleCreateBooking() {
  // 1. 예약 생성
  const { data: booking } = await supabase
    .from('bookings')
    .insert({
      trainer_id: trainerId,
      customer_id: primaryParticipant.customer_id,
      session_type: sessionType,
      max_participants: maxParticipants,
      current_participants: participants.length,
      price: totalPrice,
      // ... 기타 필드
    })
    .select()
    .single()

  // 2. 참가자 등록
  const participantRecords = participants.map(p => ({
    booking_id: booking.id,
    customer_id: p.customer_id || null,
    guest_name: p.guest_name || null,
    guest_phone: p.guest_phone || null,
    guest_email: p.guest_email || null,
    guest_birth_date: p.guest_birth_date || null,
    guest_gender: p.guest_gender || null,
    payment_amount: p.payment_amount,
    payment_status: p.payment_status,
    is_primary: p.is_primary,
    attendance_status: 'confirmed',
  }))

  await supabase
    .from('booking_participants')
    .insert(participantRecords)
}
```

### 예약 조회 (참가자 포함)

```typescript
const { data: booking } = await supabase
  .from('bookings')
  .select(`
    *,
    booking_participants(
      *,
      customer:customers(
        id,
        profiles(full_name, email, phone)
      )
    )
  `)
  .eq('id', bookingId)
  .single()

// 참가자 목록
const participants = booking.booking_participants.map(bp => ({
  id: bp.id,
  name: bp.customer_id
    ? bp.customer.profiles.full_name
    : bp.guest_name,
  email: bp.customer_id
    ? bp.customer.profiles.email
    : bp.guest_email,
  isMember: !!bp.customer_id,
  paymentAmount: bp.payment_amount,
  paymentStatus: bp.payment_status,
}))
```

## 📊 수입 관리 업데이트

### 기존 방식 (1:1)
```typescript
const earnings = bookings.reduce((sum, b) =>
  sum + b.price, 0
)
```

### 새로운 방식 (그룹 세션 포함)
```typescript
// 방법 1: booking_participants에서 직접 집계
const { data } = await supabase
  .from('booking_participants')
  .select('payment_amount')
  .eq('payment_status', 'paid')
  .in('booking_id', bookingIds)

const earnings = data.reduce((sum, p) =>
  sum + p.payment_amount, 0
)

// 방법 2: 뷰 활용
const { data } = await supabase
  .from('booking_participants_summary')
  .select('total_payment')
  .in('booking_id', bookingIds)

const earnings = data.reduce((sum, row) =>
  sum + row.total_payment, 0
)
```

## 🎯 핵심 비즈니스 로직

### 1. 참가자 추가 시 금액 자동 분배
```typescript
const updatedParticipants = [...participants, newParticipant].map((p, idx, arr) => ({
  ...p,
  payment_amount: Math.round(totalPrice / arr.length),
}))
```

### 2. 참가자 제거 시 재분배
```typescript
const updatedParticipants = participants
  .filter(p => p.id !== removedId)
  .map((p, idx, arr) => ({
    ...p,
    payment_amount: Math.round(totalPrice / arr.length),
  }))
```

### 3. 금액 검증
```typescript
const totalPaymentAmount = participants.reduce((sum, p) =>
  sum + p.payment_amount, 0
)

if (totalPaymentAmount !== totalPrice) {
  // 경고 표시
}
```

### 4. 회원/비회원 검증
```typescript
const isValid = participant.customer_id ||
  (participant.guest_name && participant.guest_phone)

if (!isValid) {
  throw new Error('참가자 정보가 불완전합니다')
}
```

## 🔐 권한 관리 (RLS)

### 관리자
- 모든 예약의 참가자 조회/수정 가능

### 트레이너
- 자신의 예약 참가자 조회/수정 가능
- 출석 체크 가능

### 고객
- 자신이 주최한 예약에 참가자 추가 가능
- 자신이 참가한 예약의 참가자 목록 조회 가능
- 자신의 결제 정보만 수정 가능

## 📝 마이그레이션 체크리스트

### SQL 실행
```bash
# Supabase Dashboard에서 실행
/supabase/13-group-sessions.sql
```

### 실행 후 확인사항
- ✅ `bookings` 테이블에 3개 컬럼 추가 확인
- ✅ `booking_participants` 테이블 생성 확인
- ✅ 기존 예약에 대한 참가자 데이터 마이그레이션 확인
- ✅ RLS 정책 활성화 확인
- ✅ 트리거 동작 확인 (참가자 추가/삭제 시 current_participants 자동 업데이트)

### 확인 쿼리
```sql
-- 기존 예약에 참가자가 생성되었는지 확인
SELECT
  b.id,
  b.session_type,
  b.max_participants,
  b.current_participants,
  COUNT(bp.id) as actual_participants
FROM bookings b
LEFT JOIN booking_participants bp ON bp.booking_id = b.id
GROUP BY b.id;

-- 참가자 수와 current_participants가 일치하는지 확인
SELECT * FROM bookings
WHERE current_participants != (
  SELECT COUNT(*) FROM booking_participants
  WHERE booking_id = bookings.id
);
```

## 🚀 다음 단계

1. **예약 생성 페이지 업데이트**
   - 세션 타입 선택 UI 추가
   - `BookingParticipantsManager` 컴포넌트 통합
   - 참가자 데이터 저장 로직 추가

2. **예약 상세 페이지 업데이트**
   - 참가자 목록 표시
   - 개별 결제 상태 표시
   - 출석 체크 기능

3. **수입 관리 페이지 업데이트**
   - `booking_participants` 기반 수입 계산
   - 참가자별 결제 현황
   - 미수금 추적

4. **알림 시스템 확장**
   - 모든 참가자에게 예약 확인 알림
   - 회원 참가자는 자동 알림
   - 비회원 참가자는 이메일/SMS

## ⚠️ 주의사항

1. **예약 주최자 (is_primary) 보호**
   - 주최자는 삭제 불가
   - 최소 1명은 항상 유지

2. **금액 검증**
   - 참가자별 금액 합계 = 전체 금액 검증 필수
   - 저장 전 검증 로직 필수

3. **회원 중복 체크**
   - 같은 예약에 동일 회원 중복 추가 방지

4. **비회원 필수 정보**
   - 이름, 연락처는 필수
   - 저장 전 검증 필수

5. **RLS 주의**
   - 고객은 자신이 참가하지 않은 예약의 참가자 조회 불가
   - API에서 권한 체크 필수
