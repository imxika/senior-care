-- ============================================
-- 롤백: 전체 데이터 복원
-- ============================================

-- 백업 테이블 존재 확인
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'bookings_backup_full'
  ) THEN
    RAISE EXCEPTION '❌ 백업 테이블이 존재하지 않습니다!';
  END IF;
END $$;

-- 데이터 복원 (순서 중요!)
-- 1. 예약 복원
INSERT INTO bookings SELECT * FROM bookings_backup_full ON CONFLICT (id) DO NOTHING;

-- 2. 결제 복원
INSERT INTO payments SELECT * FROM payments_backup_full ON CONFLICT (id) DO NOTHING;

-- 3. 리뷰 복원
INSERT INTO reviews SELECT * FROM reviews_backup_full ON CONFLICT (id) DO NOTHING;

-- 4. 트레이너 응답 복원
INSERT INTO trainer_match_responses SELECT * FROM trainer_match_responses_backup_full ON CONFLICT (id) DO NOTHING;

-- 5. 알림 복원
INSERT INTO notifications SELECT * FROM notifications_backup_full ON CONFLICT (id) DO NOTHING;

-- 복원 결과 확인
DO $$
DECLARE
  restored_bookings INTEGER;
  restored_payments INTEGER;
  restored_reviews INTEGER;
  restored_responses INTEGER;
  restored_notifications INTEGER;
BEGIN
  SELECT COUNT(*) INTO restored_bookings FROM bookings;
  SELECT COUNT(*) INTO restored_payments FROM payments;
  SELECT COUNT(*) INTO restored_reviews FROM reviews;
  SELECT COUNT(*) INTO restored_responses FROM trainer_match_responses;
  SELECT COUNT(*) INTO restored_notifications FROM notifications;

  RAISE NOTICE '✅ 복원 완료:';
  RAISE NOTICE '  - 예약: % 건', restored_bookings;
  RAISE NOTICE '  - 결제: % 건', restored_payments;
  RAISE NOTICE '  - 리뷰: % 건', restored_reviews;
  RAISE NOTICE '  - 트레이너 응답: % 건', restored_responses;
  RAISE NOTICE '  - 알림: % 건', restored_notifications;
END $$;
