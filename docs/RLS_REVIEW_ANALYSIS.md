# RLS 정책 전체 리뷰 및 분석

**작성일**: 2025-10-10
**목적**: 전체 RLS 정책의 안전성, 일관성, 누락 권한 분석
**분석 범위**: 8개 주요 테이블 + 자동 매칭 시스템

---

## 📋 목차

1. [전체 RLS 매트릭스](#전체-rls-매트릭스)
2. [순환 참조 및 충돌 분석](#순환-참조-및-충돌-분석)
3. [권한 누락 및 과다 권한 분석](#권한-누락-및-과다-권한-분석)
4. [보안 취약점 분석](#보안-취약점-분석)
5. [권장 사항 및 개선안](#권장-사항-및-개선안)

---

## 전체 RLS 매트릭스

### 1. profiles 테이블

| 정책 이름 | 작업 | 대상 | 조건 | 상태 | 파일 |
|---------|------|------|------|------|------|
| `profiles_select_own` | SELECT | authenticated | `id = auth.uid()` | ✅ | 20251007300000 |
| `profiles_select_trainers` | SELECT | authenticated | `user_type = 'trainer'` | ✅ | 20251007300000 |
| `profiles_select_customers_with_booking` | SELECT | authenticated | 예약이 있는 고객만 | ✅ | 20251007300000 |
| `profiles_update_own` | UPDATE | authenticated | `id = auth.uid()` | ✅ | 20251007300000 |
| `profiles_insert_new_user` | INSERT | authenticated | `id = auth.uid()` | ✅ | 20251007330000 |
| `Admin can view all profiles` | SELECT | authenticated | `user_type = 'admin'` | ⚠️ | 20251005095601 |
| `Admin can update all profiles` | UPDATE | authenticated | `user_type = 'admin'` | ⚠️ | 20251005095601 |

**분석**:
- ✅ 기본 권한: 자신의 프로필 조회/수정
- ✅ 공개 정보: 트레이너 프로필은 모두 공개
- ✅ 제한적 접근: 고객 프로필은 예약 관계가 있을 때만
- ⚠️ **잠재적 순환 참조**: Admin 정책에서 `profiles` 테이블을 서브쿼리로 참조
- ❌ **DELETE 정책 없음**: 프로필 삭제 불가

---

### 2. customers 테이블

| 정책 이름 | 작업 | 대상 | 조건 | 상태 | 파일 |
|---------|------|------|------|------|------|
| `customers_select_own` | SELECT | authenticated | `profile_id = auth.uid()` | ✅ | 20251007300000 |
| `customers_insert_own` | INSERT | authenticated | `profile_id = auth.uid()` | ✅ | 20251007300000 |
| `customers_update_own` | UPDATE | authenticated | `profile_id = auth.uid()` | ✅ | 20251007300000 |
| `Admin can view all customers` | SELECT | authenticated | `user_type = 'admin'` | ⚠️ | 20251005095601 |
| `Admin can update all customers` | UPDATE | authenticated | `user_type = 'admin'` | ⚠️ | 20251005095601 |

**분석**:
- ✅ 고객은 자신의 정보만 접근 가능
- ✅ 트리거로 자동 생성 (SECURITY DEFINER)
- ⚠️ **Admin 정책 순환 참조**: `profiles` 서브쿼리
- ❌ **DELETE 정책 없음**: 고객 탈퇴 불가
- ❌ **트레이너 조회 권한 없음**: 트레이너가 고객 정보 볼 수 없음 (예약 시 필요)

---

### 3. trainers 테이블

| 정책 이름 | 작업 | 대상 | 조건 | 상태 | 파일 |
|---------|------|------|------|------|------|
| `trainers_select_own` | SELECT | authenticated | `profile_id = auth.uid()` | ✅ | 20251007300000 |
| `trainers_select_verified` | SELECT | authenticated | `is_verified = true AND is_active = true` | ✅ | 20251007300000 |
| `trainers_update_own` | UPDATE | authenticated | `profile_id = auth.uid()` | ✅ | 20251007300000 |
| `Admin can view all trainers` | SELECT | authenticated | `user_type = 'admin'` | ⚠️ | 20251005095601 |
| `Admin can update all trainers` | UPDATE | authenticated | `user_type = 'admin'` | ⚠️ | 20251005095601 |

**분석**:
- ✅ 검증된 트레이너는 모두 공개
- ✅ 트레이너는 자신의 정보만 수정
- ⚠️ **Admin 정책 순환 참조**
- ❌ **INSERT 정책 없음**: 트레이너 가입 불가 (관리자 승인 필요하므로 의도적일 수 있음)
- ❌ **DELETE 정책 없음**: 트레이너 탈퇴 불가

---

### 4. bookings 테이블

| 정책 이름 | 작업 | 대상 | 조건 | 상태 | 파일 |
|---------|------|------|------|------|------|
| `bookings_select_customer` | SELECT | authenticated | 자신의 예약만 | ✅ | 20251007300000 |
| `bookings_select_trainer` | SELECT | authenticated | 자신의 예약 + 추천 알림받은 예약 | ✅ | 20251010140000 (업데이트) |
| `bookings_insert_customer` | INSERT | authenticated | 고객만 예약 생성 | ✅ | 20251007300000 |
| `bookings_update_customer` | UPDATE | authenticated | 자신의 예약만 수정 | ✅ | 20251007300000 |
| `bookings_update_trainer` | UPDATE | authenticated | 자신의 예약 + 추천 예약 수락 | ✅ | 20251010140000 (업데이트) |

**분석**:
- ✅ 고객: 자신의 예약만 생성/조회/수정
- ✅ 트레이너: 자신의 예약 조회/수정 + 추천 예약 수락
- ✅ 자동 매칭: `pending_trainer_ids` 배열 활용
- ❌ **Admin 정책 없음**: Admin이 예약 관리 불가 (심각한 문제!)
- ❌ **DELETE 정책 없음**: 예약 삭제 불가 (취소는 status 변경으로 처리하므로 의도적일 수 있음)

---

### 5. reviews 테이블

| 정책 이름 | 작업 | 대상 | 조건 | 상태 | 파일 |
|---------|------|------|------|------|------|
| `reviews_select_all` | SELECT | authenticated | 모든 리뷰 공개 | ✅ | 20251007300000 |
| `reviews_insert_customer` | INSERT | authenticated | 자신의 예약에 대한 리뷰만 | ✅ | 20251007300000 |
| `reviews_update_customer` | UPDATE | authenticated | 자신의 리뷰만 수정 | ✅ | 20251007300000 |
| `reviews_update_trainer_response` | UPDATE | authenticated | 자신에 대한 리뷰에 응답 | ✅ | 20251007300000 |

**분석**:
- ✅ 모든 리뷰는 공개 (투명성)
- ✅ 고객: 자신의 예약에 리뷰 작성/수정
- ✅ 트레이너: 자신에 대한 리뷰에 응답
- ❌ **Admin 정책 없음**: Admin이 부적절한 리뷰 관리 불가
- ❌ **DELETE 정책 없음**: 리뷰 삭제 불가

---

### 6. customer_addresses 테이블

| 정책 이름 | 작업 | 대상 | 조건 | 상태 | 파일 |
|---------|------|------|------|------|------|
| `addresses_all_own` | ALL | authenticated | 자신의 주소만 | ✅ | 20251007300000 |

**분석**:
- ✅ 모든 작업 (SELECT, INSERT, UPDATE, DELETE)을 하나의 정책으로 처리
- ✅ 고객은 자신의 주소만 관리
- ❌ **트레이너 조회 권한 없음**: 트레이너가 방문 주소 확인 불가 (예약 시 필요)
- ❌ **Admin 정책 없음**: Admin이 주소 관리 불가

---

### 7. notifications 테이블

| 정책 이름 | 작업 | 대상 | 조건 | 상태 | 파일 |
|---------|------|------|------|------|------|
| `notifications_select_own` | SELECT | authenticated | `user_id = auth.uid()` | ✅ | 20251007300000 |
| `notifications_update_own` | UPDATE | authenticated | `user_id = auth.uid()` | ✅ | 20251007300000 |
| `notifications_insert_system` | INSERT | authenticated | `WITH CHECK (true)` | ⚠️ | 20251007300000 |

**분석**:
- ✅ 사용자는 자신의 알림만 조회/수정
- ⚠️ **보안 문제**: `WITH CHECK (true)` → 누구나 알림 생성 가능!
- ℹ️ **실제로는 안전**: Service Role로 실행되므로 RLS 우회
- ❌ **DELETE 정책 없음**: 알림 삭제 불가
- ❌ **Admin 정책 없음**: Admin이 전체 알림 모니터링 불가

---

### 8. trainer_match_responses 테이블 (신규)

| 정책 이름 | 작업 | 대상 | 조건 | 상태 | 파일 |
|---------|------|------|------|------|------|
| `trainer_responses_select_own` | SELECT | authenticated | 자신의 응답만 | ✅ | 20251010140000 |
| `trainer_responses_select_by_admin` | SELECT | authenticated | Admin은 모든 응답 | ✅ | 20251010140000 |
| `trainer_responses_insert_system` | INSERT | authenticated | `response_type = 'notified'` | ⚠️ | 20251010140000 |

**분석**:
- ✅ 트레이너: 자신의 응답 로그만 조회
- ✅ Admin: 모든 응답 로그 조회 (모니터링)
- ⚠️ **보안 문제**: `response_type = 'notified'` 조건만 → 누구나 'notified' 삽입 가능
- ℹ️ **실제로는 안전**: Service Role로 실행되므로 RLS 우회
- ❌ **DELETE 정책 없음**: 응답 로그 삭제 불가 (의도적 - 감사 로그)

---

## 순환 참조 및 충돌 분석

### 🔴 심각한 순환 참조 발견

#### 문제 1: Admin 정책의 순환 참조

**발생 위치**: 모든 Admin 정책 (`20251005095601_add_admin_rls_policies.sql`)

```sql
-- profiles 테이블 Admin 정책
CREATE POLICY "Admin can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles  -- ⚠️ profiles 안에서 profiles를 참조!
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);
```

**문제점**:
1. `profiles` 테이블 정책 평가 시 → `profiles` 테이블 조회 → 무한 재귀 가능성
2. PostgreSQL은 이를 감지하여 에러를 발생시키거나 정책을 무시할 수 있음
3. Admin이 로그인하면 자신의 프로필조차 조회 못할 가능성

**영향 범위**:
- `profiles` 테이블: Admin 정책
- `customers` 테이블: Admin 정책
- `trainers` 테이블: Admin 정책

**해결 방법**:
```sql
-- Option 1: auth.jwt() 사용 (JWT 토큰의 custom claim)
USING (
  (auth.jwt() ->> 'user_type') = 'admin'
);

-- Option 2: 별도의 admin_check 함수 (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  );
END;
$$;

-- 정책에서 사용
USING (is_admin());
```

#### 문제 2: trainer_match_responses의 Admin 정책

**발생 위치**: `20251010140000_auto_matching_system.sql`

```sql
CREATE POLICY "trainer_responses_select_by_admin"
ON trainer_match_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles  -- ⚠️ 동일한 순환 참조 문제
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);
```

**동일한 문제**: `profiles` 순환 참조

---

### ⚠️ 정책 충돌 가능성

#### 충돌 1: bookings 정책 중복

**발생 위치**: `20251007300000_correct_rls_policies.sql` vs `20251010140000_auto_matching_system.sql`

```sql
-- 20251007300000 (기존)
CREATE POLICY "bookings_select_trainer" ON bookings FOR SELECT ...

-- 20251010140000 (신규)
DROP POLICY IF EXISTS "bookings_select_trainer" ON bookings;
CREATE POLICY "bookings_select_trainer" ON bookings FOR SELECT ...
```

**분석**:
- ✅ `DROP POLICY IF EXISTS` 사용으로 충돌 방지
- ✅ 신규 정책이 기존 로직을 포함하고 확장
- ✅ 안전함

#### 충돌 2: 여러 마이그레이션에서 RLS 정책 수정

**문제 파일들**:
- `20251007220000_fix_bookings_rls.sql`
- `20251007230000_proper_rls_no_circular.sql`
- `20251007300000_correct_rls_policies.sql`

**분석**:
- ⚠️ RLS 정책이 여러 번 수정됨
- ⚠️ 최종 상태가 `20251007300000_correct_rls_policies.sql`인지 확인 필요
- ⚠️ 이후 마이그레이션 (auto-matching)과의 통합 필요

---

## 권한 누락 및 과다 권한 분석

### 🔴 심각한 권한 누락

#### 1. bookings 테이블 - Admin 권한 누락 (P0 - 긴급)

**문제**:
- Admin이 예약을 조회, 수정, 삭제할 수 없음
- Admin 대시보드에서 예약 관리 불가
- 자동 매칭 타임아웃 시 Admin이 수동 매칭 불가

**영향**:
- `/admin/bookings/auto-matching` 페이지 작동 불가
- `adminRematchBooking()` 함수 실행 불가 (RLS 차단)
- `adminCancelBooking()` 함수 실행 불가 (RLS 차단)

**해결 필요**:
```sql
-- bookings에 Admin 정책 추가
CREATE POLICY "bookings_select_by_admin"
ON bookings FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "bookings_update_by_admin"
ON bookings FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());
```

#### 2. customer_addresses - 트레이너 조회 권한 누락 (P1 - 높음)

**문제**:
- 트레이너가 예약된 고객의 주소를 볼 수 없음
- 방문 서비스 시 주소 확인 불가

**해결 필요**:
```sql
CREATE POLICY "addresses_select_by_trainer_with_booking"
ON customer_addresses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    INNER JOIN customers c ON c.id = b.customer_id
    INNER JOIN trainers t ON t.id = b.trainer_id
    WHERE c.id = customer_addresses.customer_id
    AND t.profile_id = auth.uid()
    AND b.status IN ('confirmed', 'in_progress')
  )
);
```

#### 3. reviews - Admin 관리 권한 누락 (P2 - 중간)

**문제**:
- Admin이 부적절한 리뷰 수정/삭제 불가
- 악의적 리뷰 관리 불가

**해결 필요**:
```sql
CREATE POLICY "reviews_update_by_admin"
ON reviews FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "reviews_delete_by_admin"
ON reviews FOR DELETE
TO authenticated
USING (is_admin());
```

#### 4. customers - 트레이너 조회 권한 누락 (P1 - 높음)

**문제**:
- 트레이너가 예약된 고객의 기본 정보 확인 불가
- 서비스 제공 시 고객 정보 필요

**해결 필요**:
```sql
CREATE POLICY "customers_select_by_trainer_with_booking"
ON customers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    INNER JOIN trainers t ON t.id = b.trainer_id
    WHERE b.customer_id = customers.id
    AND t.profile_id = auth.uid()
    AND b.status IN ('confirmed', 'in_progress', 'completed')
  )
);
```

---

### ⚠️ 과다 권한

#### 1. notifications_insert_system (P3 - 낮음)

**문제**:
```sql
CREATE POLICY "notifications_insert_system"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);  -- ⚠️ 누구나 알림 생성 가능!
```

**실제 영향**:
- Service Role로 실행되므로 RLS 우회 → 실제로는 안전
- 하지만 일반 사용자가 직접 API 호출하면 악용 가능

**권장 개선**:
```sql
-- Option 1: Service Role만 사용 (RLS 제거)
-- Option 2: 더 엄격한 정책
CREATE POLICY "notifications_insert_own_or_admin"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR is_admin()
);
```

#### 2. trainer_responses_insert_system (P3 - 낮음)

**동일한 문제**:
```sql
WITH CHECK (
  trainer_id IN (...)
  OR response_type = 'notified'  -- ⚠️ 누구나 'notified' 삽입 가능
);
```

**권장 개선**: Service Role만 사용, 일반 정책 제거

---

## 보안 취약점 분석

### 🔴 Critical (즉시 수정 필요)

#### 1. Admin 정책 순환 참조로 인한 Admin 로그인 불가
- **심각도**: Critical
- **영향**: Admin 기능 전체 마비
- **해결**: `is_admin()` 함수 또는 JWT claim 사용

#### 2. bookings Admin 정책 부재로 Admin 대시보드 작동 불가
- **심각도**: Critical
- **영향**: 자동 매칭 시스템 Admin 관리 불가
- **해결**: bookings에 Admin SELECT/UPDATE 정책 추가

---

### ⚠️ High (빠른 수정 권장)

#### 3. 트레이너가 고객 정보/주소 조회 불가
- **심각도**: High
- **영향**: 서비스 제공 시 필수 정보 접근 불가
- **해결**: 예약 관계 기반 조회 정책 추가

#### 4. DELETE 정책 전체 부재
- **심각도**: High
- **영향**: 데이터 삭제 불가, GDPR 준수 문제
- **해결**: 필요한 테이블에 DELETE 정책 추가

---

### ℹ️ Medium (개선 권장)

#### 5. notifications/trainer_responses INSERT 정책 과다 권한
- **심각도**: Medium
- **영향**: 이론상 악용 가능 (실제로는 Service Role 사용)
- **해결**: 정책 강화 또는 제거

#### 6. Admin 정책이 여러 마이그레이션 파일에 분산
- **심각도**: Medium
- **영향**: 유지보수 어려움, 일관성 부족
- **해결**: Admin 정책 통합 마이그레이션 작성

---

## 권장 사항 및 개선안

### 1단계: 긴급 수정 (즉시)

#### 1.1 Admin 정책 순환 참조 해결

**새 마이그레이션**: `20251010150000_fix_admin_circular_reference.sql`

```sql
-- is_admin() 헬퍼 함수 생성
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  );
END;
$$;

-- 모든 Admin 정책 재작성
-- profiles
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;

CREATE POLICY "profiles_select_by_admin"
ON profiles FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "profiles_update_by_admin"
ON profiles FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- customers (동일 패턴)
-- trainers (동일 패턴)
-- trainer_match_responses (동일 패턴)
```

#### 1.2 bookings Admin 정책 추가

**같은 마이그레이션 파일에 추가**:

```sql
CREATE POLICY "bookings_select_by_admin"
ON bookings FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "bookings_update_by_admin"
ON bookings FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());
```

---

### 2단계: 높은 우선순위 수정 (1-2일 내)

#### 2.1 트레이너 → 고객 정보 조회 권한

**새 마이그레이션**: `20251010160000_add_trainer_customer_access.sql`

```sql
-- customers 조회
CREATE POLICY "customers_select_by_trainer_with_booking"
ON customers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    INNER JOIN trainers t ON t.id = b.trainer_id
    WHERE b.customer_id = customers.id
    AND t.profile_id = auth.uid()
    AND b.status IN ('confirmed', 'in_progress', 'completed')
  )
);

-- customer_addresses 조회
CREATE POLICY "addresses_select_by_trainer_with_booking"
ON customer_addresses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    INNER JOIN customers c ON c.id = b.customer_id
    INNER JOIN trainers t ON t.id = b.trainer_id
    WHERE c.id = customer_addresses.customer_id
    AND t.profile_id = auth.uid()
    AND b.status IN ('confirmed', 'in_progress')
  )
);
```

#### 2.2 DELETE 정책 추가

**새 마이그레이션**: `20251010170000_add_delete_policies.sql`

```sql
-- profiles (Admin만)
CREATE POLICY "profiles_delete_by_admin"
ON profiles FOR DELETE
TO authenticated
USING (is_admin());

-- reviews (Admin만 - 부적절한 리뷰 삭제)
CREATE POLICY "reviews_delete_by_admin"
ON reviews FOR DELETE
TO authenticated
USING (is_admin());

-- notifications (사용자 본인 + Admin)
CREATE POLICY "notifications_delete_own_or_admin"
ON notifications FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR is_admin()
);
```

---

### 3단계: 중간 우선순위 개선 (1주일 내)

#### 3.1 INSERT 정책 강화

```sql
-- notifications
DROP POLICY IF EXISTS "notifications_insert_system" ON notifications;
CREATE POLICY "notifications_insert_own_or_admin"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR is_admin()
);

-- trainer_match_responses
-- Service Role 전용이므로 일반 정책 제거 고려
```

#### 3.2 Admin 정책 통합

모든 Admin 정책을 하나의 마이그레이션으로 통합:

**새 파일**: `20251010180000_consolidate_admin_policies.sql`

---

### 4단계: 장기 개선 사항

#### 4.1 RLS 정책 문서화

- 각 테이블별 권한 매트릭스 문서화
- 정책 변경 이력 관리
- 정기적인 RLS 감사

#### 4.2 테스트 자동화

```typescript
// RLS 테스트 스위트 작성
describe('RLS Policies', () => {
  describe('bookings', () => {
    it('admin can view all bookings', async () => { ... })
    it('customer can only view own bookings', async () => { ... })
    it('trainer can view assigned bookings', async () => { ... })
  })
})
```

#### 4.3 성능 최적화

- 복잡한 서브쿼리 최적화
- 인덱스 추가 (특히 JOIN이 많은 정책)
- EXPLAIN ANALYZE로 정책 평가 비용 측정

---

## 요약

### ✅ 양호한 부분
- 기본적인 사용자별 권한 분리 (고객/트레이너)
- 공개 정보와 비공개 정보 구분
- 자동 매칭 시스템 RLS 통합

### 🔴 즉시 수정 필요
1. **Admin 정책 순환 참조** → `is_admin()` 함수 사용
2. **bookings Admin 정책 부재** → SELECT/UPDATE 정책 추가

### ⚠️ 빠른 수정 권장
3. **트레이너 → 고객 정보 접근 불가** → 예약 기반 조회 정책
4. **DELETE 정책 전체 부재** → 필요한 테이블에 추가

### ℹ️ 개선 권장
5. INSERT 정책 과다 권한 → 엄격한 정책으로 교체
6. Admin 정책 분산 → 통합 관리
7. RLS 테스트 자동화
8. 정기 감사 체계 구축

---

**다음 단계**: 1단계 긴급 수정 마이그레이션 작성 및 적용
