-- stest 계정이 정말 삭제되었는지 확인

-- 1. profiles 테이블 확인
SELECT id, email, user_type, created_at
FROM profiles
WHERE email LIKE '%stest%'
ORDER BY created_at DESC;

-- 2. auth.users는 service role로만 확인 가능
-- Supabase Dashboard > Authentication > Users에서 "stest" 검색해서 확인

-- 3. 삭제 후 남은 orphan 데이터 확인
SELECT 'customers' as table_name, COUNT(*) as count
FROM customers
WHERE profile_id NOT IN (SELECT id FROM profiles)
UNION ALL
SELECT 'trainers', COUNT(*)
FROM trainers
WHERE profile_id NOT IN (SELECT id FROM profiles)
UNION ALL
SELECT 'bookings', COUNT(*)
FROM bookings
WHERE customer_id NOT IN (SELECT id FROM customers);
