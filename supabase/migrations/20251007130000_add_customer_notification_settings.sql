-- Add notification settings columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS email_booking_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_review_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_marketing_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS push_booking_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_review_notifications BOOLEAN DEFAULT true;

-- Set default values for existing rows
UPDATE customers
SET
  email_booking_notifications = true,
  email_review_notifications = true,
  email_marketing_notifications = false,
  push_booking_notifications = true,
  push_review_notifications = true
WHERE email_booking_notifications IS NULL;
