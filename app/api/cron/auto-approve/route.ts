import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 자동 승인 크론잡 엔드포인트
 * 외부 크론 서비스(Vercel Cron, cron-job.org 등)에서 호출
 *
 * 사용법:
 * 1. Vercel Cron: vercel.json에 설정
 * 2. 외부 서비스: GET https://your-domain.com/api/cron/auto-approve
 */
export async function GET(request: Request) {
  try {
    // 보안: Authorization 헤더 확인 (선택사항)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // 1시간 경과한 pending 예약 조회
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: pendingBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('id, admin_matched_at')
      .eq('booking_type', 'recommended')
      .eq('status', 'pending')
      .not('trainer_id', 'is', null)
      .not('admin_matched_at', 'is', null)
      .lt('admin_matched_at', oneHourAgo)

    if (fetchError) {
      console.error('Error fetching pending bookings:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!pendingBookings || pendingBookings.length === 0) {
      return NextResponse.json({
        message: 'No bookings to approve',
        count: 0
      })
    }

    // 자동 승인 처리
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .in('id', pendingBookings.map(b => b.id))

    if (updateError) {
      console.error('Error auto-approving bookings:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log(`✅ Auto-approved ${pendingBookings.length} booking(s)`)

    return NextResponse.json({
      message: 'Auto-approval successful',
      count: pendingBookings.length,
      bookingIds: pendingBookings.map(b => b.id)
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
