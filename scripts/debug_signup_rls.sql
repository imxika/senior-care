-- 회원가입 RLS 에러 디버깅

-- 1. profiles INSERT 정책 확인
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'INSERT'
ORDER BY policyname;

-- 2. customer 자동 생성 트리거 함수 확인
SELECT
    proname as function_name,
    prosecdef as is_security_definer,
    proconfig as configuration,
    prosrc as source_code
FROM pg_proc
WHERE proname = 'create_customer_on_profile_insert';

-- 3. profiles 테이블 트리거 확인
SELECT
    tgname as trigger_name,
    proname as function_name,
    tgenabled as is_enabled,
    prosecdef as is_security_definer
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'profiles'::regclass
AND NOT tgisinternal
ORDER BY tgname;

-- 4. customers INSERT 정책 확인
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'customers' AND cmd = 'INSERT'
ORDER BY policyname;
