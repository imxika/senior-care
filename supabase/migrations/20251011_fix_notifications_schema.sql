-- Fix notifications table schema to match code
-- Issue 1: Code uses 'link' column but DB has 'related_id'
-- Issue 2: New notification types (4) not in CHECK constraint
-- Decision: Keep related_id, ADD link column (backward compatible)

-- Step 1: Add 'link' column (code uses this for URL paths)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;

-- Step 2: Create index for link column (for faster lookups)
CREATE INDEX IF NOT EXISTS idx_notifications_link ON notifications(link);

-- Step 3: Update CHECK constraint to include new notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    -- Original types
    'booking_confirmed',
    'booking_cancelled',
    'booking_completed',
    'booking_pending',
    'booking_rejected',
    'system',
    -- New types for auto-matching system
    'booking_matched',
    'booking_request',
    'booking_request_closed',
    'auto_match_timeout'
  ));

-- Step 4: Add documentation comments
COMMENT ON COLUMN notifications.link IS '알림 클릭 시 이동할 URL 경로 (예: /customer/bookings/123)';
COMMENT ON COLUMN notifications.related_id IS '레거시 컬럼 - 새 코드는 link 사용';
