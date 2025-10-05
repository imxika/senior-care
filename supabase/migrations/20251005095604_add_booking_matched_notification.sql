-- 알림 타입에 booking_matched 추가
-- 작성일: 2025-10-05

-- 기존 CHECK 제약 조건 제거
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 새로운 CHECK 제약 조건 추가 (booking_matched 포함)
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'booking_confirmed',
    'booking_cancelled',
    'booking_completed',
    'booking_pending',
    'booking_rejected',
    'booking_matched',
    'system'
  ));

-- 코멘트 추가
COMMENT ON CONSTRAINT notifications_type_check ON notifications IS
  '알림 타입: booking_matched는 추천 예약 매칭 완료 시 사용';
