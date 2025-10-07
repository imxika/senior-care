-- 회원가입을 위한 profiles INSERT 정책만 추가
-- 기존 SELECT, UPDATE, DELETE 정책은 절대 건드리지 않음

-- INSERT 정책만 추가 (없으면 생성)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
    AND policyname = 'profiles_insert_new_user'
  ) THEN
    CREATE POLICY "profiles_insert_new_user"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

    RAISE NOTICE 'INSERT policy created successfully';
  ELSE
    RAISE NOTICE 'INSERT policy already exists, skipping';
  END IF;
END $$;

-- customer 자동 생성 트리거 함수만 SECURITY DEFINER로 변경
-- (RLS 우회를 위해 필요)
CREATE OR REPLACE FUNCTION create_customer_on_profile_insert()
RETURNS TRIGGER
SECURITY DEFINER  -- 이것만 추가하면 RLS 우회 가능
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_type = 'customer' THEN
    INSERT INTO customers (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create customer: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 검증: INSERT 정책만 확인
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'INSERT';
