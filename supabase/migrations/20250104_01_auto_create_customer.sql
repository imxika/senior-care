-- 1. Add UNIQUE constraint to customers.profile_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customers_profile_id_key'
    AND conrelid = 'customers'::regclass
  ) THEN
    ALTER TABLE customers ADD CONSTRAINT customers_profile_id_key UNIQUE (profile_id);
  END IF;
END $$;

-- 2. Add UNIQUE constraint to trainers.profile_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trainers_profile_id_key'
    AND conrelid = 'trainers'::regclass
  ) THEN
    ALTER TABLE trainers ADD CONSTRAINT trainers_profile_id_key UNIQUE (profile_id);
  END IF;
END $$;

-- 3. Function to automatically create customer record when user type is customer
CREATE OR REPLACE FUNCTION create_customer_on_profile_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create customer if user_type is 'customer'
  IF NEW.user_type = 'customer' THEN
    INSERT INTO customers (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger to run after profile insert
DROP TRIGGER IF EXISTS create_customer_after_profile_insert ON profiles;
CREATE TRIGGER create_customer_after_profile_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_customer_on_profile_insert();

-- 5. Also create customers for existing customer profiles that don't have a customer record
INSERT INTO customers (profile_id)
SELECT id FROM profiles
WHERE user_type = 'customer'
AND id NOT IN (SELECT profile_id FROM customers WHERE profile_id IS NOT NULL)
ON CONFLICT (profile_id) DO NOTHING;
