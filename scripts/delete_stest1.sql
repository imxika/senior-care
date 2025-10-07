-- stest1@test.com 완전 삭제
-- 주의: 이 작업은 되돌릴 수 없습니다!

-- 1. 관련 데이터 삭제
DELETE FROM notifications WHERE user_id = '1419e612-e412-400c-be76-d1bd42759618';
DELETE FROM customer_addresses WHERE customer_id IN (SELECT id FROM customers WHERE profile_id = '1419e612-e412-400c-be76-d1bd42759618');
DELETE FROM reviews WHERE booking_id IN (SELECT id FROM bookings WHERE customer_id IN (SELECT id FROM customers WHERE profile_id = '1419e612-e412-400c-be76-d1bd42759618'));
DELETE FROM bookings WHERE customer_id IN (SELECT id FROM customers WHERE profile_id = '1419e612-e412-400c-be76-d1bd42759618');
DELETE FROM customers WHERE profile_id = '1419e612-e412-400c-be76-d1bd42759618';

-- 2. 프로필 삭제
DELETE FROM profiles WHERE id = '1419e612-e412-400c-be76-d1bd42759618';

-- 3. auth.users는 Supabase Dashboard에서 수동 삭제하거나
-- Admin 페이지 (/admin/users)에서 삭제해야 합니다.
-- (service role key가 필요)
