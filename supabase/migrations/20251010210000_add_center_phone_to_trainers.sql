-- Add center_phone column to trainers table
-- Purpose: Store center contact phone number for center_visit bookings

ALTER TABLE trainers
ADD COLUMN center_phone VARCHAR(20);

COMMENT ON COLUMN trainers.center_phone IS 'Center contact phone number for center visit bookings';
