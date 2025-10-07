-- 기존 알림들의 link 수정
-- NULL인 link를 알림 타입에 따라 업데이트

-- 1. 트레이너에게 온 알림 (새 예약 요청) - trainer bookings로 링크
UPDATE notifications
SET link = '/trainer/bookings'
WHERE link IS NULL 
AND type IN ('booking_pending', 'booking_cancelled');

-- 2. 고객에게 온 알림 (예약 확정, 거절, 완료) - customer bookings로 링크
UPDATE notifications
SET link = '/customer/bookings'
WHERE link IS NULL 
AND type IN ('booking_confirmed', 'booking_rejected', 'booking_completed', 'booking_matched');

-- 3. 확인
SELECT 
  id,
  title,
  type,
  link,
  created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;
