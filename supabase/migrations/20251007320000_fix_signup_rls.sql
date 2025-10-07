-- 회원가입 시 profiles INSERT 정책 추가

-- profiles INSERT 정책 추가 (회원가입을 위해 필요)
DROP POLICY IF EXISTS "profiles_insert_new_user" ON profiles;

CREATE POLICY "profiles_insert_new_user"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- customer 자동 생성 트리거 함수가 SECURITY DEFINER인지 확인 후 수정
DROP FUNCTION IF EXISTS create_customer_on_profile_insert() CASCADE;

CREATE OR REPLACE FUNCTION create_customer_on_profile_insert()
RETURNS TRIGGER
SECURITY DEFINER  -- RLS 우회
SET search_path = public  -- 보안 강화
LANGUAGE plpgsql
AS $$
BEGIN
  -- user_type이 customer인 경우에만 customer 레코드 생성
  IF NEW.user_type = 'customer' THEN
    INSERT INTO customers (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 에러 발생 시 로그만 남기고 계속 진행
    RAISE WARNING 'Failed to create customer record for profile %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 트리거 재생성
DROP TRIGGER IF EXISTS create_customer_on_profile_insert_trigger ON profiles;

CREATE TRIGGER create_customer_on_profile_insert_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_customer_on_profile_insert();

-- 검증: 정책 확인
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;
