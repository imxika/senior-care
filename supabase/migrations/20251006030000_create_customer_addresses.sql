-- Create customer_addresses table for managing multiple addresses per customer
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  address_detail TEXT,
  address_label TEXT, -- '집', '부모님 집', '센터' 등
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);

-- Add RLS policies
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

-- Customers can view their own addresses
CREATE POLICY "Customers can view own addresses"
  ON customer_addresses
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

-- Customers can insert their own addresses
CREATE POLICY "Customers can insert own addresses"
  ON customer_addresses
  FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

-- Customers can update their own addresses
CREATE POLICY "Customers can update own addresses"
  ON customer_addresses
  FOR UPDATE
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

-- Customers can delete their own addresses
CREATE POLICY "Customers can delete own addresses"
  ON customer_addresses
  FOR DELETE
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

-- Trainers can view addresses for their bookings
CREATE POLICY "Trainers can view addresses for their bookings"
  ON customer_addresses
  FOR SELECT
  USING (
    customer_id IN (
      SELECT customer_id FROM bookings
      WHERE trainer_id IN (
        SELECT id FROM trainers WHERE profile_id = auth.uid()
      )
    )
  );

-- Admins can view all addresses
CREATE POLICY "Admins can view all addresses"
  ON customer_addresses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Add address_id to bookings table to track which address was used
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES customer_addresses(id) ON DELETE SET NULL;

-- Create index for bookings address lookup
CREATE INDEX IF NOT EXISTS idx_bookings_address_id ON bookings(address_id);

-- Migrate existing customer default addresses to customer_addresses table
INSERT INTO customer_addresses (customer_id, address, address_detail, address_label, is_default)
SELECT
  id as customer_id,
  address,
  address_detail,
  '기본 주소' as address_label,
  true as is_default
FROM customers
WHERE address IS NOT NULL AND address != ''
ON CONFLICT DO NOTHING;
