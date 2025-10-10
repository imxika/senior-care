import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createNotification, notificationTemplates } from '@/lib/notifications'

/**
 * Cron Job: 자동 매칭 타임아웃 체크 (매 5분마다 실행)
 *
 * 30분 내에 트레이너가 승인하지 않은 추천 예약을 찾아서
 * Admin에게 알림을 보내고 fallback_to_admin = true로 설정
 */
export async function GET(request: NextRequest) {
  console.log('🕐 [CRON] Check auto-match timeout - START')

  // Vercel Cron Secret 검증
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('❌ [CRON] Unauthorized')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  try {
    // 1. 타임아웃된 예약 찾기
    // - matching_status = 'pending'
    // - trainer_id IS NULL (아직 매칭 안됨)
    // - auto_match_deadline < NOW() (마감 시간 지남)
    // - fallback_to_admin = false (아직 Admin 알림 안 보냄)
    const { data: timedOutBookings, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        duration_minutes,
        service_type,
        auto_match_deadline,
        notified_at,
        pending_trainer_ids,
        customer:customers!bookings_customer_id_fkey(
          id,
          profile:profiles!customers_profile_id_fkey(
            id,
            full_name
          )
        )
      `)
      .eq('booking_type', 'recommended')
      .eq('matching_status', 'pending')
      .is('trainer_id', null)
      .eq('fallback_to_admin', false)
      .lt('auto_match_deadline', new Date().toISOString())

    if (fetchError) {
      console.error('❌ [CRON] Fetch error:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!timedOutBookings || timedOutBookings.length === 0) {
      console.log('✅ [CRON] No timed-out bookings found')
      return NextResponse.json({
        success: true,
        message: 'No timed-out bookings',
        count: 0
      })
    }

    console.log(`⚠️ [CRON] Found ${timedOutBookings.length} timed-out bookings`)

    // 2. 각 타임아웃 예약 처리
    const results = await Promise.allSettled(
      timedOutBookings.map(async (booking) => {
        console.log(`🔄 [CRON] Processing booking ${booking.id}`)

        // 2.1. fallback_to_admin = true로 설정
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            fallback_to_admin: true,
            admin_notified_at: new Date().toISOString()
          })
          .eq('id', booking.id)

        if (updateError) {
          console.error(`❌ [CRON] Update error for ${booking.id}:`, updateError)
          throw updateError
        }

        // 2.2. Admin들 찾기
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_type', 'admin')

        if (!admins || admins.length === 0) {
          console.warn('⚠️ [CRON] No admins found')
          return { bookingId: booking.id, adminNotified: 0 }
        }

        // 2.3. 모든 Admin에게 알림
        interface CustomerData {
          id: string
          profile?: {
            id: string
            full_name: string
          } | Array<{ id: string; full_name: string }>
        }

        const customer = booking.customer as unknown as CustomerData
        const customerProfile = Array.isArray(customer?.profile) ? customer.profile[0] : customer?.profile
        const customerName = customerProfile?.full_name || '고객'
        const scheduledAt = new Date(`${booking.booking_date}T${booking.start_time}`)

        const notification = notificationTemplates.autoMatchTimeout(customerName, scheduledAt)

        const notificationResults = await Promise.allSettled(
          admins.map(admin =>
            createNotification({
              userId: admin.id,
              title: notification.title,
              message: notification.message,
              type: notification.type,
              link: `/admin/bookings/recommended/${booking.id}/match`
            })
          )
        )

        const successCount = notificationResults.filter(r => r.status === 'fulfilled').length

        console.log(`✅ [CRON] Booking ${booking.id}: Notified ${successCount}/${admins.length} admins`)

        return {
          bookingId: booking.id,
          adminNotified: successCount,
          deadline: booking.auto_match_deadline,
          notifiedAt: booking.notified_at,
          pendingTrainerCount: booking.pending_trainer_ids?.length || 0
        }
      })
    )

    const successResults = results.filter(r => r.status === 'fulfilled')
    const failedResults = results.filter(r => r.status === 'rejected')

    console.log(`🎯 [CRON] Complete: ${successResults.length} success, ${failedResults.length} failed`)

    return NextResponse.json({
      success: true,
      processed: timedOutBookings.length,
      succeeded: successResults.length,
      failed: failedResults.length,
      results: successResults.map(r => r.status === 'fulfilled' ? r.value : null)
    })

  } catch (error) {
    console.error('❌ [CRON] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
