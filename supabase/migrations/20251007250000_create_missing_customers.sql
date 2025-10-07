-- 누락된 customer 레코드 생성
-- customer 타입 프로필이 있지만 customers 테이블에 레코드가 없는 경우 자동 생성

INSERT INTO customers (profile_id)
SELECT p.id
FROM profiles p
LEFT JOIN customers c ON c.profile_id = p.id
WHERE p.user_type = 'customer'
  AND c.id IS NULL;

-- 생성된 레코드 수 확인
SELECT
  COUNT(*) as total_customers,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 minute' THEN 1 END) as newly_created
FROM customers;
