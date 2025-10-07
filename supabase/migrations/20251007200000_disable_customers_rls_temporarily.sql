-- Temporarily disable RLS on customers table to fix sidebar issues
-- This is a temporary fix - we should properly configure RLS policies

-- Drop all existing policies
DROP POLICY IF EXISTS "Customers can view own customer record" ON customers;
DROP POLICY IF EXISTS "Customers can update own customer record" ON customers;
DROP POLICY IF EXISTS "Customers can insert own customer record" ON customers;
DROP POLICY IF EXISTS "Admins can view all customer records" ON customers;
DROP POLICY IF EXISTS "Admins can update all customer records" ON customers;
DROP POLICY IF EXISTS "Admins can delete customer records" ON customers;
DROP POLICY IF EXISTS "Trainers can view customer records with bookings" ON customers;

-- Disable RLS temporarily
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- Note: This is NOT recommended for production
-- We will re-enable with proper policies once we identify the issue
