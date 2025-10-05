-- 알림 테이블 생성
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('booking_confirmed', 'booking_cancelled', 'booking_completed', 'booking_pending', 'booking_rejected', 'system')),
  related_id UUID, -- booking_id 또는 다른 관련 ID
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- RLS 정책 활성화
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- 사용자는 자신의 알림만 조회 가능
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 알림만 업데이트 가능 (읽음 처리)
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 시스템에서만 알림 생성 가능 (서비스 롤)
CREATE POLICY "Service role can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- 사용자는 자신의 알림 삭제 가능
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- 알림 생성 함수
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
