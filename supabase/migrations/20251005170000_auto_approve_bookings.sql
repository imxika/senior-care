-- 1시간 경과 후 자동 승인 함수
CREATE OR REPLACE FUNCTION auto_approve_pending_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 추천 예약: 매칭 후 1시간 경과하고 아직 pending 상태인 경우 자동 승인
  UPDATE bookings
  SET
    status = 'confirmed',
    updated_at = now()
  WHERE
    booking_type = 'recommended'
    AND status = 'pending'
    AND trainer_id IS NOT NULL
    AND admin_matched_at IS NOT NULL
    AND admin_matched_at < (now() - INTERVAL '1 hour');

  -- 로그 출력 (선택사항)
  RAISE NOTICE '자동 승인 완료: % 건', (SELECT count(*) FROM bookings WHERE status = 'confirmed' AND updated_at > (now() - INTERVAL '1 minute'));
END;
$$;

-- pg_cron 확장 활성화 (Supabase에서는 이미 활성화되어 있음)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 매 10분마다 자동 승인 함수 실행
-- 주의: pg_cron은 Supabase Pro 플랜 이상에서만 사용 가능
-- 무료 플랜에서는 Supabase Edge Functions를 사용해야 함

-- Supabase에서 pg_cron 사용 시:
-- SELECT cron.schedule(
--   'auto-approve-bookings',
--   '*/10 * * * *',  -- 매 10분마다
--   $$SELECT auto_approve_pending_bookings()$$
-- );

-- 수동 실행 예시:
-- SELECT auto_approve_pending_bookings();

COMMENT ON FUNCTION auto_approve_pending_bookings() IS '매칭 후 1시간 경과한 pending 상태 예약을 자동으로 confirmed로 변경';
