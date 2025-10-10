-- Create function to mark expired pending_payment bookings
-- Recommended bookings: 24 hours grace period (no specific trainer/time conflict)
-- Direct bookings: 10 minutes grace period (holding specific trainer's time slot)
-- Note: Sets status to 'expired' instead of deleting (better UX and analytics)

CREATE OR REPLACE FUNCTION cleanup_expired_bookings()
RETURNS TABLE (
  expired_count bigint,
  expired_booking_ids uuid[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count bigint;
  v_expired_ids uuid[];
BEGIN
  -- Mark expired pending_payment bookings based on booking type
  WITH updated AS (
    UPDATE bookings
    SET
      status = 'expired',
      updated_at = NOW()
    WHERE status = 'pending_payment'
      AND (
        -- Recommended: 24 hours grace period
        (booking_type = 'recommended' AND created_at < NOW() - INTERVAL '24 hours')
        OR
        -- Direct: 10 minutes grace period (holding trainer's specific time slot)
        (booking_type = 'direct' AND created_at < NOW() - INTERVAL '10 minutes')
      )
    RETURNING id, booking_type, created_at
  )
  SELECT
    COUNT(*)::bigint,
    ARRAY_AGG(id)
  INTO v_expired_count, v_expired_ids
  FROM updated;

  -- Return results
  RETURN QUERY SELECT v_expired_count, v_expired_ids;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION cleanup_expired_bookings() IS
'Marks pending_payment bookings as expired: recommended (24h), direct (10min). Returns count and IDs.';

-- Grant execute permission to authenticated users (for manual cleanup)
GRANT EXECUTE ON FUNCTION cleanup_expired_bookings() TO authenticated;
