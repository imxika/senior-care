-- Add birth_date and guardian information to customers table

-- 1. Add birth_date column (replacing age functionality)
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 2. Add guardian information columns
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS guardian_name TEXT,
ADD COLUMN IF NOT EXISTS guardian_relationship TEXT,
ADD COLUMN IF NOT EXISTS guardian_phone TEXT;

-- 3. Migrate existing age data to approximate birth_date (optional, only if age exists)
-- This assumes current year minus age as birth year (January 1st)
-- You can skip this if you want users to manually update their birth dates
UPDATE customers
SET birth_date = DATE(EXTRACT(YEAR FROM CURRENT_DATE) - age || '-01-01')
WHERE age IS NOT NULL AND birth_date IS NULL;

-- 4. Add comment for documentation
COMMENT ON COLUMN customers.birth_date IS 'Customer birth date for accurate age calculation';
COMMENT ON COLUMN customers.guardian_name IS 'Guardian/caregiver name (optional)';
COMMENT ON COLUMN customers.guardian_relationship IS 'Relationship to customer (e.g., 자녀, 배우자, 친구)';
COMMENT ON COLUMN customers.guardian_phone IS 'Guardian contact phone number';
