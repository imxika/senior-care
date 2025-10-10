-- =========================================
-- 기존 매칭 대기 중인 예약 데이터 정리
-- =========================================
-- 목적: notified_at, auto_match_deadline이 NULL인 기존 예약들을
--       Admin 개입 필요 상태로 변경
-- 실행 시점: Auto-matching 시스템 RLS 완료 후

-- 1. 정리할 예약 확인 (실행 전 확인)
SELECT
  id,
  booking_date,
  start_time,
  service_type,
  matching_status,
  notified_at,
  auto_match_deadline,
  pending_trainer_ids,
  created_at
FROM bookings
WHERE booking_type = 'recommended'
AND matching_status = 'pending'
AND trainer_id IS NULL
AND notified_at IS NULL;

-- 2. Admin 개입 필요 상태로 변경
UPDATE bookings
SET
  fallback_to_admin = true,
  admin_notified_at = NOW()
WHERE booking_type = 'recommended'
AND matching_status = 'pending'
AND trainer_id IS NULL
AND notified_at IS NULL;

-- 3. 업데이트된 예약 개수 확인
SELECT
  COUNT(*) as cleaned_bookings_count
FROM bookings
WHERE fallback_to_admin = true
AND admin_notified_at IS NOT NULL;

-- 4. 정리 후 상태 확인
SELECT
  id,
  booking_date,
  start_time,
  fallback_to_admin,
  admin_notified_at
FROM bookings
WHERE booking_type = 'recommended'
AND matching_status = 'pending'
AND trainer_id IS NULL
ORDER BY admin_notified_at DESC;

-- =========================================
-- 검증 쿼리 (Admin 대시보드에서 확인)
-- =========================================
-- 이제 "Admin 개입 필요" 섹션에서 이 예약들을 볼 수 있습니다
-- /admin/bookings/auto-matching 페이지에서 확인

-- =========================================
-- 참고: 롤백
-- =========================================
-- 만약 다시 되돌리려면:
-- UPDATE bookings
-- SET
--   fallback_to_admin = false,
--   admin_notified_at = NULL
-- WHERE booking_type = 'recommended'
-- AND matching_status = 'pending'
-- AND trainer_id IS NULL
-- AND notified_at IS NULL;
