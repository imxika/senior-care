-- ROLLBACK: Revert notifications table from link (TEXT) back to related_id (UUID)
-- Use this if you need to undo the changes from 20251010_fix_notifications_related_id_to_link.sql

-- Step 1: Rename column back from link to related_id and change type back to UUID
ALTER TABLE notifications
ALTER COLUMN link TYPE UUID USING link::UUID;

ALTER TABLE notifications
RENAME COLUMN link TO related_id;

-- Step 2: Revert create_notification function to original
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_related_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, related_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_related_id)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Step 3: Revert review notification trigger functions to original
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

  -- Create notification for trainer (original version with review ID)
  PERFORM create_notification(
    v_trainer_profile_id,
    '새로운 리뷰가 등록되었습니다',
    v_customer_name || '님이 ' || NEW.rating || '점 리뷰를 남겼습니다.',
    'review_received',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_customer_review_response()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_profile_id UUID;
  v_trainer_name TEXT;
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

    -- Create notification for customer (original version with review ID)
    PERFORM create_notification(
      v_customer_profile_id,
      '트레이너가 답글을 남겼습니다',
      v_trainer_name || '님이 회원님의 리뷰에 답글을 남겼습니다.',
      'review_response',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
