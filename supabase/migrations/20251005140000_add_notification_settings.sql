-- 알림 설정 테이블 생성
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- 알림 타입별 설정
  recommended_booking_enabled BOOLEAN DEFAULT true,
  direct_booking_enabled BOOLEAN DEFAULT true,
  booking_matched_enabled BOOLEAN DEFAULT true,
  booking_confirmed_enabled BOOLEAN DEFAULT true,
  booking_cancelled_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

-- RLS 활성화
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 설정만 볼 수 있음
CREATE POLICY "Users can view own notification settings"
  ON notification_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- 정책: 사용자는 자신의 설정을 생성할 수 있음
CREATE POLICY "Users can insert own notification settings"
  ON notification_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 정책: 사용자는 자신의 설정을 수정할 수 있음
CREATE POLICY "Users can update own notification settings"
  ON notification_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 인덱스 생성
CREATE INDEX notification_settings_user_id_idx ON notification_settings(user_id);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE notification_settings IS '사용자별 알림 설정';
COMMENT ON COLUMN notification_settings.recommended_booking_enabled IS '추천 예약 생성 알림 활성화';
COMMENT ON COLUMN notification_settings.direct_booking_enabled IS '직접 예약 생성 알림 활성화';
COMMENT ON COLUMN notification_settings.booking_matched_enabled IS '예약 매칭 완료 알림 활성화';
COMMENT ON COLUMN notification_settings.booking_confirmed_enabled IS '예약 확정 알림 활성화';
COMMENT ON COLUMN notification_settings.booking_cancelled_enabled IS '예약 취소 알림 활성화';
