-- 트레이너 승인 알림 타입 추가
-- notifications 테이블의 type 제약 조건 업데이트

-- 기존 제약 조건 삭제
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 새로운 제약 조건 추가 (트레이너 승인 타입 포함)
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'booking_confirmed',
    'booking_cancelled',
    'booking_completed',
    'booking_pending',
    'booking_rejected',
    'trainer_matched',
    'recommended_booking_created',
    'review_received',
    'review_response',
    'trainer_approval_approved',  -- 트레이너 승인 완료
    'trainer_approval_rejected',  -- 트레이너 승인 거절
    'system'
  ));

-- 알림 type 필드에 link 필드 추가 (이미 있으면 무시)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'notifications' AND column_name = 'link') THEN
    ALTER TABLE notifications ADD COLUMN link TEXT;
  END IF;
END $$;
