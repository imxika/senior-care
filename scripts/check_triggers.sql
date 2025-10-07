-- 트리거 확인

-- 1. profiles 테이블의 트리거 확인
SELECT
    tgname as trigger_name,
    proname as function_name,
    prosecdef as is_security_definer
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'profiles'::regclass
AND NOT tgisinternal;

-- 2. customer/trainer 자동 생성 함수 확인
SELECT
    proname,
    prosecdef as is_security_definer,
    proconfig
FROM pg_proc
WHERE proname IN ('create_customer_on_profile_insert', 'create_trainer_on_profile_insert');
