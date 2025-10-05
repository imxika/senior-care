# Base SQL Files Review (1-10.sql)

나중을 위한 Base SQL 파일 검토 및 수정 완료

---

## 수정된 파일 (Updated Files)

### ✅ 1-tables.sql
**수정 내용**:
- `customers.profile_id`에 UNIQUE 제약 추가
- `trainers.profile_id`에 UNIQUE 제약 추가

**이유**: 한 profile당 하나의 customer/trainer 레코드만 생성되도록 보장

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE, -- ⚠️ UNIQUE 추가
  ...
);

CREATE TABLE trainers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE, -- ⚠️ UNIQUE 추가
  ...
);
```

---

### ✅ 3-triggers.sql
**수정 내용**:
- `create_customer_on_profile_insert()` 함수 추가
- `create_customer_after_profile_insert` 트리거 추가

**이유**: 회원가입 시 customer 레코드 자동 생성 (user_type = 'customer'일 때)

```sql
CREATE OR REPLACE FUNCTION create_customer_on_profile_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_type = 'customer' THEN
    INSERT INTO customers (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_customer_after_profile_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_customer_on_profile_insert();
```

---

### ✅ 5-more-policies.sql
**수정 내용**:
- "Customers can update own pending bookings" 정책 삭제
- "Customers can update own bookings" 정책 생성 (상태 제한 없음)

**이유**: 확정된(confirmed) 예약도 취소할 수 있도록 허용

```sql
-- ❌ 기존 (pending만 가능)
CREATE POLICY "Customers can update own pending bookings"
  ON bookings FOR UPDATE
  USING (
    bookings.status = 'pending' AND -- ⚠️ 제한적
    EXISTS (...)
  );

-- ✅ 수정 (모든 상태 가능)
CREATE POLICY "Customers can update own bookings"
  ON bookings FOR UPDATE
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
```

---

### ✅ 9-seed-trainers.sql
**수정 내용**:
- 모든 UPDATE 문의 WHERE 절 수정
- `WHERE id IN (SELECT id FROM profiles...)` → `WHERE profile_id IN (SELECT id FROM profiles...)`

**이유**: trainers 테이블의 FK는 `profile_id`이지 `id`가 아님 (docs 참조)

```sql
-- ❌ 기존 (잘못된 ID 참조)
UPDATE trainers SET ...
WHERE id IN (SELECT id FROM profiles WHERE email = 'trainer1@test.com');

-- ✅ 수정 (올바른 FK 참조)
UPDATE trainers SET ...
WHERE profile_id IN (SELECT id FROM profiles WHERE email = 'trainer1@test.com');
```

---

## 검토 완료, 수정 불필요 (Reviewed, No Changes Needed)

### ✅ 2-indexes.sql
**상태**: 수정 불필요

**이유**:
- 모든 인덱스가 올바른 컬럼 참조
- `idx_customers_profile_id`, `idx_trainers_profile_id` 이미 존재
- UNIQUE 제약과 인덱스는 별도 개념이므로 추가 작업 불필요

---

### ✅ 4-policies.sql
**상태**: 수정 불필요

**이유**:
- 모든 RLS 정책이 올바른 ID 참조 패턴 사용
- `profiles.id = auth.uid()` 패턴 일관되게 적용
- `customers.profile_id`, `trainers.profile_id` FK 관계 정확

**특이사항**:
- 5-more-policies.sql과 분리되어 있는 이유: 기본 정책(4)과 추가 정책(5)으로 구분
- 5번에서 bookings 정책만 수정됨

---

### ✅ 6-create-admin.sql
**상태**: 수정 불필요

**이유**:
- 주석으로만 구성된 가이드 파일
- 실제 실행 코드는 10-setup-admin.sql에 있음

---

### ✅ 7-add-education-fields.sql
**상태**: 수정 불필요

**이유**:
- ALTER TABLE 문법 정확
- JSONB 필드와 BOOLEAN 필드 추가만 수행
- ID 참조 없음

---

### ✅ 8-add-profile-fields.sql
**상태**: 수정 불필요

**이유**:
- ALTER TABLE 문법 정확
- 추가 필드만 생성
- ID 참조 없음

---

### ✅ 10-setup-admin.sql
**상태**: 수정 불필요

**이유**:
- 올바른 ID 참조 사용 (`profiles.id = auth.users.id`)
- ON CONFLICT 처리 정확
- RLS 정책에서 JWT 이메일 검증 방식 사용 (올바름)

---

## 요약 (Summary)

### 수정된 파일: 4개
1. ✅ 1-tables.sql - UNIQUE 제약 추가
2. ✅ 3-triggers.sql - 자동 customer 생성 트리거
3. ✅ 5-more-policies.sql - 예약 취소 정책 수정
4. ✅ 9-seed-trainers.sql - WHERE 절 FK 참조 수정

### 검토 완료: 6개
5. ✅ 2-indexes.sql
6. ✅ 4-policies.sql
7. ✅ 6-create-admin.sql
8. ✅ 7-add-education-fields.sql
9. ✅ 8-add-profile-fields.sql
10. ✅ 10-setup-admin.sql

### 전체 결과
**10/10 파일 검토 완료** ✅

모든 Base SQL 파일이 [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) 기준에 맞게 수정/검증되었습니다.

---

## 다음 프로젝트 설정 시 (For Next Project Setup)

```bash
# 1. 순서대로 실행
psql -d your_db < supabase/1-tables.sql
psql -d your_db < supabase/2-indexes.sql
psql -d your_db < supabase/3-triggers.sql
psql -d your_db < supabase/4-policies.sql
psql -d your_db < supabase/5-more-policies.sql

# 2. 추가 필드 (선택사항)
psql -d your_db < supabase/7-add-education-fields.sql
psql -d your_db < supabase/8-add-profile-fields.sql

# 3. 샘플 데이터 (개발용)
psql -d your_db < supabase/9-seed-trainers.sql

# 4. Admin 설정
psql -d your_db < supabase/10-setup-admin.sql
```

또는 Supabase CLI:
```bash
npx supabase db push
```

---

**마지막 업데이트**: 2025-01-04
**검토자**: Claude Code
**기준 문서**: docs/DATABASE_SCHEMA.md
