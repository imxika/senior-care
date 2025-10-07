-- 남아있는 모든 RLS 정책 완전 삭제

-- 1. 각 테이블의 남은 정책 확인
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '=== Dropping all remaining policies ===';

  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'customers', 'trainers', 'bookings', 'notifications', 'reviews', 'customer_addresses')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
    RAISE NOTICE 'Dropped policy: % on %', policy_record.policyname, policy_record.tablename;
  END LOOP;
END $$;

-- 2. 확인 - 남은 정책 개수
SELECT
  tablename,
  COUNT(*) as remaining_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'customers', 'trainers', 'bookings', 'notifications', 'reviews', 'customer_addresses')
GROUP BY tablename
ORDER BY tablename;

-- 3. 아무것도 안나와야 정상
SELECT CASE
  WHEN COUNT(*) = 0 THEN '✅ All policies successfully removed'
  ELSE '❌ ' || COUNT(*)::text || ' policies still remaining'
END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'customers', 'trainers', 'bookings', 'notifications', 'reviews', 'customer_addresses');
