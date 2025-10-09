-- =====================================================
-- Migration 26: Add RLS to payment_event_timeline view
-- =====================================================
-- Purpose: Secure payment_event_timeline view with RLS policies

-- Enable RLS on the view
ALTER VIEW payment_event_timeline SET (security_invoker = true);

-- Note: Views with security_invoker = true will use the calling user's permissions
-- This means the RLS policies on payment_events table will automatically apply to this view

-- =====================================================
-- End of Migration
-- =====================================================
