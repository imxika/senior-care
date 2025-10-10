-- ============================================
-- 롤백: 백업에서 데이터 복원
-- ============================================

-- 백업 테이블이 존재하는지 확인
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'bookings_backup_20251010'
  ) THEN
    RAISE EXCEPTION '백업 테이블이 존재하지 않습니다!';
  END IF;
END $$;

-- 데이터 복원
INSERT INTO bookings
SELECT * FROM bookings_backup_20251010
ON CONFLICT (id) DO NOTHING;

-- 복원 결과 확인
DO $$
DECLARE
  restored_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO restored_count FROM bookings WHERE booking_type = 'recommended';
  RAISE NOTICE '복원 완료: % 건의 예약이 복원되었습니다', restored_count;
END $$;
