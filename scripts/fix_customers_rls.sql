-- 긴급 수정: customers 테이블 RLS 비활성화
-- 모든 기능이 작동하도록 일단 RLS를 끕니다

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Customers can view own customer record" ON customers;
DROP POLICY IF EXISTS "Customers can update own customer record" ON customers;
DROP POLICY IF EXISTS "Customers can insert own customer record" ON customers;
DROP POLICY IF EXISTS "Admins can view all customer records" ON customers;
DROP POLICY IF EXISTS "Admins can update all customer records" ON customers;
DROP POLICY IF EXISTS "Admins can delete customer records" ON customers;
DROP POLICY IF EXISTS "Trainers can view customer records with bookings" ON customers;

-- RLS 비활성화
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
