# Center Management System

**작성일**: 2025-10-11
**버전**: 1.0
**관련 마이그레이션**: `20251011230000_add_center_owner_and_policies.sql`, `20251011234500_fix_center_rls_recursion.sql`

## 개요

트레이너가 자신의 센터를 등록하고 관리할 수 있으며, 관리자가 센터 승인/거부를 처리하는 시스템입니다.

## 주요 기능

### 1. 트레이너 센터 등록 (`/trainer/settings/center`)

**기능**:
- 트레이너가 자신의 센터 정보 등록
- 센터당 owner 1명만 가능
- 승인 대기 중인 센터는 수정/삭제 가능
- 승인된 센터는 읽기 전용

**등록 정보**:
- 센터명 (필수)
- 주소 (선택)
- 전화번호 (선택)
- 사업자등록번호 (선택)
- 설명 (선택)

**컴포넌트**: `/app/(dashboard)/trainer/settings/center/center-form.tsx`

**주요 기능**:
```typescript
// 센터 등록
await createCenter({
  name: '센터명',
  address: '주소',
  phone: '010-0000-0000',
  business_registration_number: '123-45-67890',
  description: '센터 설명'
})

// 승인 전 센터만 수정 가능
if (!center.is_verified) {
  await updateCenter(centerId, updatedData)
}

// 승인 전 센터만 삭제 가능
if (!center.is_verified) {
  await deleteCenter(centerId)
}
```

### 2. 관리자 센터 관리 (`/admin/centers`)

**기능**:
- 전체 센터 목록 조회 (승인/미승인 모두)
- 승인 대기 센터 필터링
- 센터 상세 정보 조회
- 센터 승인/거부

**목록 페이지**: `/app/(dashboard)/admin/centers/page.tsx`
**상세 페이지**: `/app/(dashboard)/admin/centers/[id]/page.tsx`

**승인/거부 API**:
```typescript
// 센터 승인
POST /api/admin/centers/approve
{
  "centerId": "uuid"
}

// 센터 거부
POST /api/admin/centers/reject
{
  "centerId": "uuid",
  "reason": "거부 사유"
}
```

### 3. 트레이너 프로필 센터 선택 (`/trainer/settings/profile`)

**기능**:
- 승인된 센터 목록에서 검색 및 선택
- 센터명, 사업자번호로 검색
- 센터 방문 서비스 제공 시 필수

**컴포넌트**: `/components/center-selector.tsx`

**사용 방법**:
```tsx
<CenterSelector
  selectedCenterId={centerId}
  onCenterSelect={setCenterId}
  disabled={!centerVisitAvailable}
/>
```

### 4. 고객 화면에 센터 정보 표시

**표시 위치**:
- 트레이너 목록 페이지 (`/trainers`)
- 트레이너 상세 페이지 (`/trainers/[id]`)
- 예약 페이지 (`/trainers/[id]/booking`)

**표시 정보**:
- 센터명
- 센터 주소
- 센터 연락처 (클릭 시 전화 연결)

## 데이터베이스 스키마

### centers 테이블

```sql
CREATE TABLE centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  business_registration_number TEXT,
  description TEXT,
  owner_id UUID REFERENCES trainers(id) ON DELETE SET NULL,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**주요 컬럼**:
- `owner_id`: 센터 소유자 (트레이너 1명만)
- `is_verified`: 관리자 승인 여부
- `verified_at`: 승인 시각
- `verified_by`: 승인한 관리자 ID

### trainers 테이블 변경

```sql
ALTER TABLE trainers ADD COLUMN center_id UUID REFERENCES centers(id);
```

**기존 컬럼 deprecated**:
- ~~`center_name`~~ → `centers.name`
- ~~`center_address`~~ → `centers.address`
- ~~`center_phone`~~ → `centers.phone`

## RLS (Row Level Security) 정책

### centers 테이블 정책

```sql
-- 트레이너: 자신의 센터만 조회
CREATE POLICY "Trainers view own centers"
  ON centers FOR SELECT
  USING (owner_id = get_current_trainer_id());

-- 트레이너: 자신의 센터만 등록
CREATE POLICY "Trainers insert own centers"
  ON centers FOR INSERT
  WITH CHECK (owner_id = get_current_trainer_id());

-- 트레이너: 미승인 센터만 수정
CREATE POLICY "Trainers update unverified centers"
  ON centers FOR UPDATE
  USING (
    owner_id = get_current_trainer_id()
    AND is_verified = false
  );

-- 트레이너: 미승인 센터만 삭제
CREATE POLICY "Trainers delete unverified centers"
  ON centers FOR DELETE
  USING (
    owner_id = get_current_trainer_id()
    AND is_verified = false
  );

-- 관리자: 모든 센터 조회/수정
CREATE POLICY "Admins full access"
  ON centers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'
    )
  );
```

### RLS 무한 재귀 해결

**문제**: `centers` 정책이 `trainers` 조회 시, `trainers.center_id`가 다시 `centers`를 참조하여 무한 재귀 발생

**해결**: `SECURITY DEFINER` 함수로 RLS 우회

```sql
CREATE OR REPLACE FUNCTION get_current_trainer_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER  -- RLS 우회
STABLE
SET search_path = public
AS $$
  SELECT id
  FROM public.trainers
  WHERE profile_id = auth.uid()
  LIMIT 1;
$$;
```

## API 엔드포인트

### 센터 검색 API

```typescript
GET /api/centers/search?q={searchQuery}

// Response
{
  "centers": [
    {
      "id": "uuid",
      "name": "센터명",
      "address": "주소",
      "business_registration_number": "123-45-67890"
    }
  ]
}
```

**특징**:
- 승인된 센터만 반환
- 센터명, 사업자번호로 검색
- 최대 20개 반환

### 센터 승인 API

```typescript
POST /api/admin/centers/approve

// Request
{
  "centerId": "uuid"
}

// Response
{
  "success": true,
  "message": "센터가 승인되었습니다",
  "center": { ... }
}
```

**동작**:
1. 관리자 권한 확인
2. `is_verified = true` 설정
3. `verified_at`, `verified_by` 기록

### 센터 거부 API

```typescript
POST /api/admin/centers/reject

// Request
{
  "centerId": "uuid",
  "reason": "거부 사유"
}

// Response
{
  "success": true,
  "message": "센터가 거부되었습니다",
  "reason": "거부 사유"
}
```

**동작**:
1. 관리자 권한 확인
2. 센터 삭제
3. (TODO) 트레이너에게 거부 사유 알림

## 주요 컴포넌트

### CenterSelector

**위치**: `/components/center-selector.tsx`

**Props**:
```typescript
interface CenterSelectorProps {
  selectedCenterId: string | null
  onCenterSelect: (centerId: string | null) => void
  disabled?: boolean
}
```

**기능**:
- Command 컴포넌트 기반 검색 드롭다운
- 실시간 검색 (1글자 이상)
- 센터 상세 정보 표시 (이름, 주소, ID)

### ApprovalActions

**위치**: `/app/(dashboard)/admin/centers/[id]/approval-actions.tsx`

**Props**:
```typescript
interface ApprovalActionsProps {
  centerId: string
  centerName: string
}
```

**기능**:
- 승인 버튼 (확인 다이얼로그)
- 거부 버튼 (사유 입력 필수)
- 로딩 상태 관리
- Sonner 토스트 알림

## 워크플로우

### 센터 등록 → 승인 → 프로필 연동 워크플로우

```
1. 트레이너: 센터 등록
   ↓
2. 관리자: 센터 목록에서 확인
   ↓
3. 관리자: 센터 상세 페이지에서 승인/거부
   ↓
4. 승인된 경우:
   - is_verified = true
   - verified_at = now()
   - verified_by = admin_id
   ↓
5. 트레이너: 프로필 설정에서 승인된 센터 선택
   - trainers.center_id 업데이트
   ↓
6. 고객: 트레이너 검색/상세/예약 시 센터 정보 표시
```

## 주의사항

1. **Owner 제한**: 센터당 owner는 1명만 가능 (현재 owner_id는 unique 제약 없음)
2. **승인 후 수정 불가**: 승인된 센터는 트레이너가 수정/삭제 불가
3. **알림 기능 미구현**: 승인/거부 시 트레이너 알림 기능 TODO
4. **이미지 업로드 미구현**: 센터 이미지 업로드 기능 TODO

## TODO

- [ ] 센터 owner_id unique 제약 추가 고려
- [ ] 승인/거부 시 트레이너 알림 시스템 구현
- [ ] 센터 이미지 업로드 기능 구현
- [ ] 센터 공개 페이지 (`/centers`) 구현
- [ ] 센터별 트레이너 목록 표시

## 테스트 시나리오

### 트레이너 센터 등록
1. 트레이너로 로그인
2. `/trainer/settings/center` 접속
3. 센터 정보 입력 후 등록
4. 승인 대기 상태 확인 (is_verified = false)

### 관리자 센터 승인
1. 관리자로 로그인
2. `/admin/centers` 접속
3. 승인 대기 센터 클릭
4. 센터 상세 정보 확인
5. "승인" 버튼 클릭
6. 승인 완료 확인 (is_verified = true)

### 트레이너 센터 선택
1. 트레이너로 로그인
2. `/trainer/settings/profile` 접속
3. "센터 방문" 체크
4. 센터 선택 드롭다운에서 검색
5. 승인된 센터 선택
6. 프로필 저장

### 고객 센터 정보 확인
1. 고객으로 로그인
2. `/trainers` 접속
3. 센터를 선택한 트레이너 카드에서 센터 정보 확인
4. 트레이너 상세 페이지에서 센터 정보 카드 확인
5. 예약 페이지에서 센터 정보 확인

## 관련 파일

### 마이그레이션
- `supabase/migrations/20251011230000_add_center_owner_and_policies.sql`
- `supabase/migrations/20251011234500_fix_center_rls_recursion.sql`

### 컴포넌트
- `/app/(dashboard)/trainer/settings/center/center-form.tsx`
- `/app/(dashboard)/admin/centers/page.tsx`
- `/app/(dashboard)/admin/centers/[id]/page.tsx`
- `/app/(dashboard)/admin/centers/[id]/approval-actions.tsx`
- `/components/center-selector.tsx`

### API 라우트
- `/app/api/centers/search/route.ts`
- `/app/api/admin/centers/approve/route.ts`
- `/app/api/admin/centers/reject/route.ts`

### 액션
- `/app/(dashboard)/trainer/settings/center/actions.ts`
- `/app/(dashboard)/trainer/settings/profile/actions.ts`

### 쿼리
- `/lib/supabase/queries.ts` (getVerifiedTrainers)

### UI 컴포넌트
- `/components/ui/command.tsx`
- `/components/admin-sidebar.tsx`
