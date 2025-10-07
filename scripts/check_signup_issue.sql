-- 회원가입 시 RLS 에러 원인 확인

-- 1. customer 자동 생성 트리거 함수 확인
SELECT
    proname as function_name,
    prosecdef as is_security_definer,
    proconfig as configuration
FROM pg_proc
WHERE proname = 'create_customer_on_profile_insert';

-- 2. profiles INSERT 정책 확인
SELECT policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'INSERT'
ORDER BY policyname;

-- 3. customers INSERT 정책 확인
SELECT policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'customers' AND cmd = 'INSERT'
ORDER BY policyname;

-- 4. profiles 테이블의 트리거 목록
SELECT
    tgname as trigger_name,
    proname as function_name,
    tgenabled as is_enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'profiles'::regclass
AND NOT tgisinternal
ORDER BY tgname;
