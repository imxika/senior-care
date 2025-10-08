-- =====================================================
-- Migration: Add Payment-related Fields to Bookings
-- Description: 결제 시스템을 위한 bookings 테이블 필드 추가
-- Version: 1.0
-- Date: 2025-10-09
-- =====================================================

-- 결제 관련 필드 추가
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS group_size INTEGER DEFAULT 1 CHECK (group_size >= 1 AND group_size <= 10),
ADD COLUMN IF NOT EXISTS host_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_split_payment BOOLEAN DEFAULT false;

-- 컬럼 코멘트 추가
COMMENT ON COLUMN bookings.confirmed_at IS '트레이너 승인 시각 (결제 시점)';
COMMENT ON COLUMN bookings.completed_at IS '서비스 완료 시각';
COMMENT ON COLUMN bookings.cancelled_at IS '취소 시각';
COMMENT ON COLUMN bookings.cancellation_deadline IS '무료 취소 마감 시각 (서비스 24시간 전)';
COMMENT ON COLUMN bookings.group_size IS '서비스 인원 수 (1:N에서 N값)';
COMMENT ON COLUMN bookings.host_customer_id IS '분할 결제 호스트 (예약자)';
COMMENT ON COLUMN bookings.is_split_payment IS '분할 결제 여부';

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_bookings_confirmed_at ON bookings(confirmed_at);
CREATE INDEX IF NOT EXISTS idx_bookings_completed_at ON bookings(completed_at);
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at ON bookings(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_host_customer_id ON bookings(host_customer_id);

-- 트리거 함수: 예약 확정 시 취소 마감 시각 자동 계산
CREATE OR REPLACE FUNCTION set_cancellation_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- 예약이 confirmed 상태로 변경되고 confirmed_at이 설정될 때
  IF NEW.status = 'confirmed' AND NEW.confirmed_at IS NOT NULL AND OLD.confirmed_at IS NULL THEN
    -- 서비스 시작 24시간 전을 취소 마감 시각으로 설정
    NEW.cancellation_deadline =
      (NEW.booking_date::timestamp + NEW.start_time::interval) - INTERVAL '24 hours';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_set_cancellation_deadline ON bookings;
CREATE TRIGGER trigger_set_cancellation_deadline
  BEFORE INSERT OR UPDATE OF status, confirmed_at ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_cancellation_deadline();

-- booking status CHECK 제약 업데이트 (새로운 상태 추가)
-- 기존: 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
-- 추가: 'cancelled_by_customer', 'cancelled_by_customer_late', 'cancelled_by_trainer'

-- 기존 제약 삭제
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- 새로운 제약 추가
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
    'cancelled_by_customer',
    'cancelled_by_customer_late',
    'cancelled_by_trainer'
  ));

-- 상태 목록:
-- 'pending'                    : 트레이너 승인 대기
-- 'confirmed'                  : 예약 확정 (결제 완료)
-- 'in_progress'                : 서비스 진행 중
-- 'completed'                  : 서비스 완료
-- 'cancelled'                  : 취소 (일반)
-- 'cancelled_by_customer'      : 고객 취소 (24시간 전)
-- 'cancelled_by_customer_late' : 고객 취소 (24시간 이내)
-- 'cancelled_by_trainer'       : 트레이너 취소
-- 'no_show'                    : 노쇼
