-- 트리거 함수 수정: RLS 우회하도록 SECURITY DEFINER 강화
-- 신규 회원 가입 시 customer/trainer 레코드 자동 생성

-- 1. Customer 자동 생성 함수 (RLS 우회)
CREATE OR REPLACE FUNCTION create_customer_on_profile_insert()
RETURNS TRIGGER
SECURITY DEFINER  -- 트리거 생성자(postgres) 권한으로 실행
SET search_path = public  -- 보안 강화
AS $$
BEGIN
  -- Only create customer if user_type is 'customer'
  IF NEW.user_type = 'customer' THEN
    -- RLS를 우회하여 직접 INSERT
    INSERT INTO customers (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 에러 발생해도 profile 생성은 계속 진행
    RAISE WARNING 'Failed to create customer record for profile %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trainer 자동 생성 함수 (RLS 우회)
CREATE OR REPLACE FUNCTION create_trainer_on_profile_insert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create trainer if user_type is 'trainer'
  IF NEW.user_type = 'trainer' THEN
    INSERT INTO trainers (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create trainer record for profile %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 트리거 재생성
DROP TRIGGER IF EXISTS create_customer_after_profile_insert ON profiles;
CREATE TRIGGER create_customer_after_profile_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_customer_on_profile_insert();

DROP TRIGGER IF EXISTS create_trainer_after_profile_insert ON profiles;
CREATE TRIGGER create_trainer_after_profile_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_trainer_on_profile_insert();

-- 4. 기존 누락된 레코드 생성 (RLS 일시적으로 비활성화)
DO $$
BEGIN
  -- Customers 테이블 RLS 일시 해제
  ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

  -- 누락된 customer 레코드 생성
  INSERT INTO customers (profile_id)
  SELECT id FROM profiles
  WHERE user_type = 'customer'
  AND id NOT IN (SELECT profile_id FROM customers WHERE profile_id IS NOT NULL)
  ON CONFLICT (profile_id) DO NOTHING;

  -- RLS 재활성화
  ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

  -- Trainers도 동일하게 처리
  ALTER TABLE trainers DISABLE ROW LEVEL SECURITY;

  INSERT INTO trainers (profile_id)
  SELECT id FROM profiles
  WHERE user_type = 'trainer'
  AND id NOT IN (SELECT profile_id FROM trainers WHERE profile_id IS NOT NULL)
  ON CONFLICT (profile_id) DO NOTHING;

  ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
END $$;

-- 5. 확인 쿼리
SELECT
  p.user_type,
  COUNT(*) as profile_count,
  COUNT(c.id) as customer_count,
  COUNT(t.id) as trainer_count
FROM profiles p
LEFT JOIN customers c ON c.profile_id = p.id AND p.user_type = 'customer'
LEFT JOIN trainers t ON t.profile_id = p.id AND p.user_type = 'trainer'
GROUP BY p.user_type;
