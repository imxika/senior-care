-- Add review notification types to notifications table
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'booking_confirmed',
  'booking_cancelled',
  'booking_completed',
  'booking_pending',
  'booking_rejected',
  'booking_matched',
  'review_received',
  'review_response',
  'system'
));

-- Function to create notification for new review
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

  -- Create notification for trainer
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

-- Function to create notification for trainer response
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

    -- Create notification for customer
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

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_trainer_new_review ON reviews;
DROP TRIGGER IF EXISTS trigger_notify_customer_review_response ON reviews;

-- Create trigger for new reviews
CREATE TRIGGER trigger_notify_trainer_new_review
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_trainer_new_review();

-- Create trigger for trainer responses
CREATE TRIGGER trigger_notify_customer_review_response
  AFTER UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_customer_review_response();
