-- 기존 사용자 현황 확인
-- 모든 user_type별 통계

SELECT
  user_type,
  COUNT(*) as count,
  string_agg(email, ', ') as emails
FROM profiles
GROUP BY user_type
ORDER BY user_type;

-- Customer/Trainer 레코드 매칭 확인
SELECT
  p.user_type,
  COUNT(p.id) as profile_count,
  COUNT(c.id) as customer_count,
  COUNT(t.id) as trainer_count
FROM profiles p
LEFT JOIN customers c ON c.profile_id = p.id
LEFT JOIN trainers t ON t.profile_id = p.id
GROUP BY p.user_type;

-- 문제가 될 수 있는 케이스 확인
SELECT
  'Profile 있는데 customer/trainer 레코드 둘 다 없음' as issue,
  p.id,
  p.email,
  p.user_type
FROM profiles p
LEFT JOIN customers c ON c.profile_id = p.id
LEFT JOIN trainers t ON t.profile_id = p.id
WHERE c.id IS NULL AND t.id IS NULL;
