# Day 10: 결제 만료 시스템 & 센터 정보 관리

**작성일**: 2025-10-10
**버전**: 1.0.0
**상태**: ✅ 완료

---

## 📋 목차
- [개요](#개요)
- [결제 만료 시스템](#결제-만료-시스템)
- [센터 정보 관리](#센터-정보-관리)
- [데이터베이스 스키마](#데이터베이스-스키마)
- [구현 세부사항](#구현-세부사항)
- [테스트 가이드](#테스트-가이드)

---

## 개요

### 구현 배경
1. **결제 만료 시스템**: 예약 후 결제하지 않은 예약이 계속 남아있어 트레이너에게 불필요한 알림이 가는 문제
2. **센터 정보 관리**: 센터 방문 서비스를 제공하는 트레이너의 센터 정보가 고객에게 표시되지 않는 문제

### 핵심 목표
- ✅ 미결제 예약 자동 만료 처리
- ✅ 결제 완료 후에만 트레이너 알림 발송
- ✅ 센터 정보 입력 및 표시
- ✅ 체크아웃 페이지 카운트다운 타이머

---

## 결제 만료 시스템

### 1. 새로운 예약 상태

```typescript
// lib/constants.ts
export const BOOKING_STATUS = {
  PENDING_PAYMENT: "pending_payment",  // 🆕 결제 대기
  PENDING: "pending",                  // 트레이너 승인 대기 (결제 완료됨)
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  REJECTED: "rejected",
  NO_SHOW: "no_show",
  EXPIRED: "expired"                   // 🆕 만료됨
} as const
```

### 2. 워크플로우 변경

#### 이전 워크플로우 (문제점)
```
예약 생성 → pending (트레이너 승인 대기)
  ↓ 즉시 알림 발송 ❌ (미결제 상태인데 알림)
  ↓ 결제
confirmed (확정)
```

#### 새로운 워크플로우 (개선)
```
예약 생성 → pending_payment (결제 대기)
  ↓ 10분/24시간 경과 → expired (만료)
  ↓ 결제 완료
pending (트레이너 승인 대기)
  ↓ 결제 완료 후 알림 발송 ✅
  ↓ 트레이너 승인
confirmed (확정)
```

### 3. 자동 만료 로직

#### 만료 시간 정책
- **지정 예약 (Direct)**: 10분
  - 이유: 특정 트레이너의 특정 시간대를 잡아둠
  - 빠른 결제 필요

- **추천 예약 (Recommended)**: 24시간
  - 이유: 아직 트레이너 매칭 전
  - 여유 있는 결제 시간

#### Cleanup 함수

```sql
-- supabase/migrations/20251010200000_create_cleanup_expired_bookings_function.sql

CREATE OR REPLACE FUNCTION cleanup_expired_bookings()
RETURNS TABLE (
  expired_count bigint,
  expired_booking_ids uuid[]
)
LANGUAGE plpgsql
SECURITY DEFINER  -- RLS 우회
AS $$
DECLARE
  v_expired_count bigint;
  v_expired_ids uuid[];
BEGIN
  WITH updated AS (
    UPDATE bookings
    SET
      status = 'expired',
      updated_at = NOW()
    WHERE status = 'pending_payment'
      AND (
        -- 추천: 24시간
        (booking_type = 'recommended' AND created_at < NOW() - INTERVAL '24 hours')
        OR
        -- 지정: 10분
        (booking_type = 'direct' AND created_at < NOW() - INTERVAL '10 minutes')
      )
    RETURNING id, booking_type, created_at
  )
  SELECT
    COUNT(*)::bigint,
    ARRAY_AGG(id)
  INTO v_expired_count, v_expired_ids
  FROM updated;

  RETURN QUERY SELECT v_expired_count, v_expired_ids;
END;
$$;
```

#### 자동 실행 위치

```typescript
// app/(dashboard)/customer/bookings/page.tsx
// 예약 목록 로드 시 자동 cleanup

// ⏰ 만료된 예약 자동 정리
try {
  const { data: cleanupResult } = await supabase.rpc('cleanup_expired_bookings')
  if (cleanupResult && cleanupResult[0]?.expired_count > 0) {
    console.log(`✅ [CLEANUP] ${cleanupResult[0].expired_count} bookings marked as expired`)
  }
} catch (cleanupError) {
  console.error('❌ [CLEANUP] Failed to run cleanup:', cleanupError)
}
```

### 4. 결제 완료 후 액션 트리거

```typescript
// app/api/payments/stripe/confirm/route.ts

// 12. Booking 상태 업데이트
await supabase
  .from('bookings')
  .update({
    status: 'pending', // 🆕 결제 완료 후 pending으로 변경
  })
  .eq('id', payment.booking_id);

// 13. 예약 타입에 따라 후속 처리
if (booking.booking_type === 'direct' && booking.trainer_id) {
  // 🆕 지정 예약: 트레이너에게 승인 요청 알림
  await createNotification({
    userId: trainer.profile_id,
    type: 'booking_request',
    title: '새로운 예약 요청',
    message: `${customer.profiles.full_name}님의 예약 요청이 있습니다.`,
    link: `/trainer/bookings/${payment.booking_id}`,
  });
} else if (booking.booking_type === 'recommended') {
  // 🆕 추천 예약: 자동 매칭 시작
  const { notifySuitableTrainers } = await import('@/lib/auto-matching');
  await notifySuitableTrainers(booking.id);
}
```

### 5. 체크아웃 페이지 카운트다운

```typescript
// app/checkout/[bookingId]/PaymentTimer.tsx

export default function PaymentTimer({
  bookingType,
  createdAt,
  bookingId
}: PaymentTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const createdTime = new Date(createdAt).getTime()
    const expiryDuration = bookingType === 'direct'
      ? 10 * 60 * 1000  // 10분
      : 24 * 60 * 60 * 1000  // 24시간

    const calculateTimeLeft = () => {
      const now = Date.now()
      const expiryTime = createdTime + expiryDuration
      const remaining = expiryTime - now

      if (remaining <= 0) {
        setIsExpired(true)
        setTimeLeft(0)
        // 3초 후 예약 목록으로 리다이렉트
        setTimeout(() => {
          router.push('/customer/bookings')
        }, 3000)
        return 0
      }

      setTimeLeft(remaining)
      return remaining
    }

    // 1초마다 업데이트
    const interval = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(interval)
  }, [createdAt, bookingType, router, bookingId])

  // 긴급도 계산 (지정 예약만)
  const urgency = bookingType === 'direct'
    ? timeLeft < 3 * 60 * 1000 ? 'urgent'      // 3분 미만: 긴급
      : timeLeft < 5 * 60 * 1000 ? 'warning'   // 5분 미만: 경고
      : 'normal'                                // 5분 이상: 정상
    : 'normal'

  // UI 표시
  return (
    <div className={urgencyColors[urgency]}>
      {/* 시간 표시 + 긴급 메시지 */}
    </div>
  )
}
```

### 6. 예약 목록 필터링

```typescript
// app/(dashboard)/customer/bookings/page.tsx

const { data: bookings, error } = await supabase
  .from('bookings')
  .select('/* ... */')
  .eq('customer_id', customer.id)
  .neq('status', 'expired')  // 🆕 만료된 예약 제외
  .order('booking_date', { ascending: false })
```

---

## 센터 정보 관리

### 1. 데이터베이스 스키마

```sql
-- trainers 테이블에 추가
ALTER TABLE trainers
ADD COLUMN center_name VARCHAR(255),
ADD COLUMN center_address TEXT,
ADD COLUMN center_phone VARCHAR(20);
```

### 2. 트레이너 프로필 편집

#### 조건부 필드 표시

```typescript
// app/(dashboard)/trainer/settings/profile/profile-edit-form.tsx

{/* 센터 정보 - 센터 방문 체크 시에만 표시 */}
{centerVisitAvailable && (
  <>
    <div className="space-y-2 pt-2 border-t">
      <Label htmlFor="center_name" className="text-sm">
        센터 이름 <span className="text-red-500">*</span>
      </Label>
      <Input
        id="center_name"
        value={centerName}
        onChange={(e) => setCenterName(e.target.value)}
        placeholder="센터 이름을 입력하세요"
        required
      />
      <p className="text-xs text-muted-foreground">
        센터 방문 서비스를 제공하려면 센터 이름이 필요합니다
      </p>
    </div>

    <div className="space-y-2">
      <Label htmlFor="center_address" className="text-sm">센터 주소 (선택)</Label>
      <Input
        id="center_address"
        value={centerAddress}
        onChange={(e) => setCenterAddress(e.target.value)}
        placeholder="센터 주소를 입력하세요"
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="center_phone" className="text-sm">센터 연락처 (선택)</Label>
      <Input
        id="center_phone"
        type="tel"
        value={centerPhone}
        onChange={(e) => setCenterPhone(e.target.value)}
        placeholder="010-0000-0000"
      />
    </div>
  </>
)}
```

#### 검증 로직

```typescript
// 클라이언트 검증
if (centerVisitAvailable && !centerName.trim()) {
  setError('센터 방문 서비스를 선택하셨습니다. 센터 이름을 입력해주세요.')
  setLoading(false)
  return
}

// 서버 검증 (actions.ts)
const centerVisitAvailable = formData.get('center_visit_available') === 'true'
const centerName = formData.get('center_name') as string

if (centerVisitAvailable && !centerName?.trim()) {
  return {
    error: '센터 방문 서비스를 선택하셨습니다. 센터 이름을 입력해주세요.'
  }
}
```

### 3. 체크아웃 페이지 표시

```typescript
// app/checkout/[bookingId]/page.tsx

// 센터 정보 추출
const centerName = trainerData?.center_name || null
const centerAddress = trainerData?.center_address || null
const centerPhone = trainerData?.center_phone || null

// UI 표시
{booking.service_type === 'center_visit' && centerName && (
  <div className="border-t pt-4">
    <p className="text-sm text-gray-500 mb-2">방문할 센터</p>
    <div className="space-y-2">
      <p className="text-lg font-semibold text-gray-900">{centerName}</p>
      {centerAddress && (
        <p className="text-gray-700">{centerAddress}</p>
      )}
      {centerPhone && (
        <p className="text-gray-700">📞 {centerPhone}</p>
      )}
    </div>
  </div>
)}
```

### 4. 트레이너 상세 페이지 센터 카드

```typescript
// app/(public)/trainers/[id]/page.tsx

{/* 센터 정보 카드 - 오른쪽 사이드바 */}
{trainer.center_visit_available && trainer.center_name && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        <Building className="h-5 w-5" />
        센터 정보
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground mb-1">센터 이름</p>
          <p className="font-semibold text-base">{trainer.center_name}</p>
        </div>
        {trainer.center_address && (
          <>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-1">주소</p>
              <p className="text-base">{trainer.center_address}</p>
            </div>
          </>
        )}
        {trainer.center_phone && (
          <>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-1">연락처</p>
              <a
                href={`tel:${trainer.center_phone}`}
                className="text-base text-primary hover:underline flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                {trainer.center_phone}
              </a>
            </div>
          </>
        )}
      </div>
    </CardContent>
  </Card>
)}
```

---

## 데이터베이스 스키마

### 마이그레이션 파일

#### 1. `20251010190000_add_pending_payment_status.sql`

```sql
-- Add pending_payment and expired statuses
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
CHECK (status = ANY (ARRAY[
  'pending_payment'::text,  -- 🆕 결제 대기
  'pending'::text,
  'confirmed'::text,
  'in_progress'::text,
  'completed'::text,
  'cancelled'::text,
  'no_show'::text,
  'cancelled_by_customer'::text,
  'cancelled_by_customer_late'::text,
  'cancelled_by_trainer'::text,
  'expired'::text  -- 🆕 만료됨
]));

COMMENT ON COLUMN bookings.status IS
  'Current booking status. pending_payment = payment not completed, pending = awaiting trainer approval';
```

#### 2. `20251010210000_add_center_phone_to_trainers.sql`

```sql
-- Add center_phone column
ALTER TABLE trainers
ADD COLUMN center_phone VARCHAR(20);

COMMENT ON COLUMN trainers.center_phone IS
  'Center contact phone number for center visit bookings';
```

#### 3. `20251010220000_add_business_verification_to_trainers.sql` (준비됨, 미사용)

사업자 등록증 인증 시스템용 스키마 (MVP에서는 보류)

```sql
ALTER TABLE trainers
ADD COLUMN business_registration_file_url TEXT,
ADD COLUMN business_verified BOOLEAN DEFAULT false,
ADD COLUMN business_verification_requested_at TIMESTAMPTZ,
ADD COLUMN business_verified_at TIMESTAMPTZ,
ADD COLUMN business_verified_by UUID REFERENCES profiles(id),
ADD COLUMN business_rejection_reason TEXT;
```

---

## 구현 세부사항

### 예약 생성 시 초기 상태 설정

#### 지정 예약

```typescript
// app/(public)/trainers/[id]/booking/actions.ts

const { data: booking, error: insertError } = await supabase
  .from('bookings')
  .insert({
    // ... booking fields
    status: 'pending_payment' // 🆕 결제 대기 상태로 시작
  })
  .select()
  .single()

console.log('📝 [CREATE-BOOKING] Created with pending_payment status')
console.log('⏳ [CREATE-BOOKING] Trainer notification will be sent after payment')
```

#### 추천 예약

```typescript
// app/(public)/booking/recommended/actions.ts

const bookingData = {
  customer_id: customerData.id,
  trainer_id: null,
  booking_type: BOOKING_TYPE.RECOMMENDED,
  status: 'pending_payment', // 🆕 결제 대기 상태로 시작
  // ... other fields
}

console.log('📝 [CREATE-BOOKING] Booking created with pending_payment status')
console.log('⏳ [CREATE-BOOKING] Auto-matching will start after payment completion')
```

### UI 상태 처리

#### 고객 예약 상세 페이지

```typescript
// components/customer-booking-detail.tsx

// pending_payment 상태 alert
{booking.status === 'pending_payment' && (
  <Alert className="border-blue-300 bg-blue-50">
    <AlertCircle className="h-4 w-4 text-blue-600" />
    <AlertDescription className="text-blue-800">
      <div className="space-y-2">
        <p className="font-bold">💳 결제를 완료해주세요</p>
        <p className="text-sm">
          {booking.booking_type === 'direct'
            ? '10분 이내에 결제를 완료하지 않으면 예약이 자동으로 취소됩니다.'
            : '24시간 이내에 결제를 완료하지 않으면 예약이 자동으로 취소됩니다.'}
        </p>
        <Link href={`/checkout/${booking.id}`}>
          <Button className="w-full mt-2">결제하러 가기 →</Button>
        </Link>
      </div>
    </AlertDescription>
  </Alert>
)}

// expired 상태 alert
{booking.status === 'expired' && (
  <Alert className="border-gray-300 bg-gray-50">
    <AlertCircle className="h-4 w-4 text-gray-600" />
    <AlertDescription className="text-gray-800">
      <div className="space-y-1">
        <p className="font-bold">⏰ 결제 시간이 만료되었습니다</p>
        <p className="text-sm">
          {booking.booking_type === 'direct'
            ? '결제 시간(10분) 내에 결제하지 않아 예약이 자동으로 취소되었습니다.'
            : '결제 시간(24시간) 내에 결제하지 않아 예약이 자동으로 취소되었습니다.'}
        </p>
        <p className="text-sm text-gray-600">다시 예약하시려면 새로 예약을 생성해주세요.</p>
      </div>
    </AlertDescription>
  </Alert>
)}

// Progress Tracker 숨김
// expired, pending_payment 상태에서는 진행 상황 표시 안 함
if (currentStatus === 'expired' || currentStatus === 'pending_payment') {
  return null
}
```

---

## 테스트 가이드

### 결제 만료 시스템 테스트

#### 1. 지정 예약 만료 (10분)

```sql
-- 테스트용: 11분 전 예약 생성
UPDATE bookings
SET
  created_at = NOW() - INTERVAL '11 minutes',
  status = 'pending_payment'
WHERE id = 'YOUR_BOOKING_ID';

-- Cleanup 실행
SELECT * FROM cleanup_expired_bookings();

-- 결과 확인
SELECT id, status, created_at, booking_type
FROM bookings
WHERE id = 'YOUR_BOOKING_ID';
-- status가 'expired'로 변경되어야 함
```

#### 2. 추천 예약 만료 (24시간)

```sql
-- 테스트용: 25시간 전 예약 생성
UPDATE bookings
SET
  created_at = NOW() - INTERVAL '25 hours',
  status = 'pending_payment'
WHERE id = 'YOUR_BOOKING_ID';

-- Cleanup 실행
SELECT * FROM cleanup_expired_bookings();

-- 결과 확인
SELECT id, status, created_at, booking_type
FROM bookings
WHERE id = 'YOUR_BOOKING_ID';
-- status가 'expired'로 변경되어야 함
```

#### 3. 자동 Cleanup 테스트

1. 예약 생성 (결제하지 않음)
2. `/customer/bookings` 페이지 방문
3. 콘솔에서 cleanup 로그 확인:
   ```
   ✅ [CLEANUP] 1 bookings marked as expired
   ```
4. 예약이 목록에서 사라짐 확인

#### 4. 카운트다운 타이머 테스트

1. 예약 생성
2. `/checkout/[bookingId]` 페이지 방문
3. 타이머 작동 확인:
   - 남은 시간 표시
   - 색상 변경 (일반 → 경고 → 긴급)
   - 만료 시 자동 리다이렉트

### 센터 정보 테스트

#### 1. 센터 정보 입력

1. 트레이너로 로그인
2. `/trainer/settings/profile` 접속
3. 편집 모드 진입
4. "센터 방문" 체크
5. 센터 이름, 주소, 연락처 입력
6. 저장

#### 2. 센터 정보 필수 검증

1. "센터 방문" 체크
2. 센터 이름 비우고 저장 시도
3. 에러 메시지 확인:
   ```
   센터 방문 서비스를 선택하셨습니다. 센터 이름을 입력해주세요.
   ```

#### 3. 센터 정보 표시

1. 센터 정보 입력 완료
2. `/trainers/[id]` 페이지 방문
3. 오른쪽 사이드바에 "센터 정보" 카드 확인
4. 센터 이름, 주소, 연락처 표시 확인
5. 연락처 클릭 시 전화 앱 실행 확인

#### 4. 체크아웃 페이지 센터 정보

1. 센터 방문 서비스 예약 생성
2. `/checkout/[bookingId]` 페이지 방문
3. "방문할 센터" 섹션 확인
4. 센터 이름, 주소, 연락처 표시 확인

---

## 향후 확장 계획

### Phase 2: 사업자 등록증 인증

스키마는 준비되어 있으므로, 필요 시 다음 기능 구현:

1. **파일 업로드**:
   - Supabase Storage 버킷 설정
   - 이미지 업로드 UI
   - 파일 크기/형식 검증

2. **Admin 검토 워크플로우**:
   - `/admin/business-verification` 페이지
   - 사업자등록증 이미지 표시
   - 승인/거부 버튼
   - 거부 사유 입력

3. **알림 시스템**:
   - 검토 요청 알림 (트레이너 → Admin)
   - 승인/거부 결과 알림 (Admin → 트레이너)

4. **인증 배지**:
   - 트레이너 카드에 "사업자 인증" 배지
   - 검색 필터에 "인증 트레이너만" 옵션

### Phase 3: 별도 센터 관리

트레이너와 센터를 분리하여 다대다 관계로 확장:

1. **centers 테이블 생성**:
   ```sql
   CREATE TABLE centers (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name VARCHAR(255) NOT NULL,
     address TEXT,
     phone VARCHAR(20),
     owner_trainer_id UUID REFERENCES trainers(id),
     business_registration_url TEXT,
     business_verified BOOLEAN DEFAULT false,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **trainer_center_affiliations 테이블**:
   ```sql
   CREATE TABLE trainer_center_affiliations (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     trainer_id UUID REFERENCES trainers(id) NOT NULL,
     center_id UUID REFERENCES centers(id) NOT NULL,
     affiliation_type VARCHAR(20) CHECK (affiliation_type IN ('employee', 'rental', 'owner')),
     is_primary BOOLEAN DEFAULT false,
     verified BOOLEAN DEFAULT false,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(trainer_id, center_id)
   );
   ```

3. **센터 관리 페이지**:
   - `/centers` - 센터 목록
   - `/centers/[id]` - 센터 상세
   - `/centers/new` - 센터 등록
   - `/trainer/settings/centers` - 내 센터 관리

---

## 요약

### ✅ 완료된 작업

1. **결제 만료 시스템**:
   - `pending_payment`, `expired` 상태 추가
   - 자동 cleanup 함수 구현
   - 카운트다운 타이머 추가
   - 결제 완료 후 액션 트리거

2. **센터 정보 관리**:
   - 센터 정보 필드 추가
   - 조건부 입력 UI
   - 검증 로직 구현
   - 체크아웃 및 상세 페이지 표시

3. **UI/UX 개선**:
   - 리뷰 카운트 정확도 향상
   - 만료 상태 메시지
   - Progress Tracker 숨김 처리

### 📊 변경 영향 범위

- **Database**: 3개 마이그레이션
- **API Routes**: 2개 수정 (Stripe, Toss)
- **Pages**: 5개 수정
- **Components**: 3개 수정
- **Functions**: 1개 추가

### 🎯 핵심 성과

- ✅ 불필요한 트레이너 알림 제거 (미결제 예약)
- ✅ 고객 UX 개선 (카운트다운, 명확한 상태 표시)
- ✅ 센터 정보 투명성 향상
- ✅ 확장 가능한 아키텍처 (사업자 인증, 센터 관리)

---

**작성자**: Claude Code
**문서 버전**: 1.0.0
**최종 수정일**: 2025-10-10
