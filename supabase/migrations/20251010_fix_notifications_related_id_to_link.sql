-- Fix notifications table: related_id (UUID) → link (TEXT)
-- This migration changes the notification system to use text links instead of UUIDs

-- Step 1: Rename column from related_id to link and change type
ALTER TABLE notifications
ALTER COLUMN related_id TYPE TEXT USING related_id::TEXT;

ALTER TABLE notifications
RENAME COLUMN related_id TO link;

-- Step 2: Update create_notification function
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_link TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (p_user_id, p_title, p_message, p_type, p_link)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Step 3: Update review notification trigger functions
CREATE OR REPLACE FUNCTION notify_trainer_new_review()
RETURNS TRIGGER AS $$
DECLARE
  v_trainer_profile_id UUID;
  v_customer_name TEXT;
BEGIN
  -- Get trainer's profile_id
  SELECT profile_id INTO v_trainer_profile_id
  FROM trainers
  WHERE id = NEW.trainer_id;

  -- Get customer name
  SELECT p.full_name INTO v_customer_name
  FROM customers c
  JOIN profiles p ON c.profile_id = p.id
  WHERE c.id = NEW.customer_id;

  -- Create notification for trainer with link to reviews page
  PERFORM create_notification(
    v_trainer_profile_id,
    '새로운 리뷰가 등록되었습니다',
    v_customer_name || '님이 ' || NEW.rating || '점 리뷰를 남겼습니다.',
    'review_received',
    '/trainer/reviews'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_customer_review_response()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_profile_id UUID;
  v_trainer_name TEXT;
  v_booking_id UUID;
BEGIN
  -- Only trigger when trainer_response is added or updated (not null)
  IF NEW.trainer_response IS NOT NULL AND (OLD.trainer_response IS NULL OR OLD.trainer_response != NEW.trainer_response) THEN
    -- Get customer's profile_id
    SELECT profile_id INTO v_customer_profile_id
    FROM customers
    WHERE id = NEW.customer_id;

    -- Get trainer name
    SELECT p.full_name INTO v_trainer_name
    FROM trainers t
    JOIN profiles p ON t.profile_id = p.id
    WHERE t.id = NEW.trainer_id;

    -- Get booking_id for link
    SELECT booking_id INTO v_booking_id
    FROM reviews
    WHERE id = NEW.id;

    -- Create notification for customer with link to booking detail
    PERFORM create_notification(
      v_customer_profile_id,
      '트레이너가 답글을 남겼습니다',
      v_trainer_name || '님이 회원님의 리뷰에 답글을 남겼습니다.',
      'review_response',
      '/customer/bookings/' || v_booking_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
