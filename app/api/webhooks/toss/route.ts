import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createNotification, notificationTemplates } from '@/lib/notifications'

/**
 * Toss Payments Webhook Handler
 * POST /api/webhooks/toss
 *
 * Toss Payments에서 결제 상태 변경 시 자동으로 호출됩니다.
 * - 결제 승인 (DONE)
 * - 결제 취소 (CANCELED)
 * - 결제 실패 (FAILED)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('[Toss Webhook] Received:', {
      eventType: body.eventType,
      orderId: body.orderId,
      status: body.status,
      timestamp: new Date().toISOString()
    })

    // Service Role client (RLS bypass)
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

    // orderId로 payment 조회
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        booking:bookings!booking_id(
          id,
          booking_date,
          start_time,
          customer_id,
          trainer:trainers!trainer_id(
            id,
            profile:profiles!profile_id(id, full_name)
          ),
          customer:customers!customer_id(
            id,
            profile:profiles!profile_id(id, full_name)
          )
        )
      `)
      .eq('order_id', body.orderId)
      .single()

    if (paymentError || !payment) {
      console.error('[Toss Webhook] Payment not found:', body.orderId)
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // 이미 처리된 상태인지 확인 (중복 방지)
    if (payment.payment_status === body.status) {
      console.log('[Toss Webhook] Already processed:', body.orderId)
      return NextResponse.json({ success: true, message: 'Already processed' })
    }

    // 결제 상태 업데이트
    const updateData: Record<string, unknown> = {
      payment_status: body.status === 'DONE' ? 'paid' :
                      body.status === 'CANCELED' ? 'cancelled' :
                      body.status === 'FAILED' ? 'failed' : body.status,
      payment_metadata: {
        ...payment.payment_metadata,
        webhook: {
          eventType: body.eventType,
          receivedAt: new Date().toISOString(),
          tossResponse: body
        }
      }
    }

    if (body.status === 'DONE') {
      updateData.paid_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', payment.id)

    if (updateError) {
      console.error('[Toss Webhook] Update failed:', updateError)
      return NextResponse.json(
        { error: 'Update failed' },
        { status: 500 }
      )
    }

    console.log('[Toss Webhook] Payment updated:', {
      paymentId: payment.id,
      status: updateData.payment_status
    })

    // 결제 완료 시 Trainer에게 알림 전송
    if (body.status === 'DONE' && payment.booking) {
      const booking = Array.isArray(payment.booking) ? payment.booking[0] : payment.booking
      const trainer = booking?.trainer
      const trainerProfile = Array.isArray(trainer?.profile) ? trainer.profile[0] : trainer?.profile

      if (trainerProfile?.id) {
        const scheduledAt = new Date(`${booking.booking_date}T${booking.start_time}`)
        const notification = notificationTemplates.paymentCompleted(
          parseFloat(payment.amount),
          scheduledAt
        )

        await createNotification({
          userId: trainerProfile.id,
          ...notification,
          link: `/trainer/bookings/${booking.id}`
        })

        console.log('[Toss Webhook] Notification sent to trainer:', trainerProfile.id)
      }
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      status: updateData.payment_status
    })

  } catch (error) {
    console.error('[Toss Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
