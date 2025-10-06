-- Add notification settings columns to trainers table
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS email_booking_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_review_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_payment_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_marketing_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS push_booking_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_review_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_payment_notifications BOOLEAN DEFAULT true;

-- Set defaults for existing trainers
UPDATE trainers SET
  email_booking_notifications = true,
  email_review_notifications = true,
  email_payment_notifications = true,
  email_marketing_notifications = false,
  push_booking_notifications = true,
  push_review_notifications = true,
  push_payment_notifications = true
WHERE email_booking_notifications IS NULL;
