-- Add booking flow tracking timestamps
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS booking_type TEXT CHECK (booking_type IN ('direct', 'recommended')),
ADD COLUMN IF NOT EXISTS trainer_matched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trainer_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS service_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS service_completed_at TIMESTAMPTZ;

-- Update existing records to have booking_type
UPDATE bookings
SET booking_type = 'direct'
WHERE booking_type IS NULL;
