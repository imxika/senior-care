import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe
 *
 * Stripe에서 이벤트 발생 시 자동으로 호출됩니다.
 * - checkout.session.completed: 결제 완료
 * - checkout.session.expired: 세션 만료
 * - payment_intent.succeeded: 결제 성공
 * - payment_intent.payment_failed: 결제 실패
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    console.error('[Stripe Webhook] Missing signature')
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    // Webhook 서명 검증
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  console.log('[Stripe Webhook] Event received:', {
    type: event.type,
    id: event.id,
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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        console.log('[Stripe Webhook] Checkout completed:', {
          sessionId: session.id,
          paymentStatus: session.payment_status
        })

        // sessionId로 payment 조회
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .select(`
            *,
            booking:bookings!booking_id(
              id,
              booking_date,
              start_time,
              booking_type,
              status,
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
          .eq('payment_metadata->>stripeSessionId', session.id)
          .single()

        if (paymentError || !payment) {
          console.error('[Stripe Webhook] Payment not found for session:', session.id)
          return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
        }

        // 이미 처리된 상태인지 확인 (중복 방지)
        if (payment.payment_status === 'paid') {
          console.log('[Stripe Webhook] Already processed:', session.id)
          return NextResponse.json({ success: true, message: 'Already processed' })
        }

        // 결제 상태 업데이트
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            payment_status: 'paid',
            paid_at: new Date().toISOString(),
            payment_metadata: {
              ...payment.payment_metadata,
              webhook: {
                eventType: event.type,
                eventId: event.id,
                receivedAt: new Date().toISOString(),
                session: {
                  id: session.id,
                  paymentStatus: session.payment_status,
                  amountTotal: session.amount_total
                }
              }
            }
          })
          .eq('id', payment.id)

        if (updateError) {
          console.error('[Stripe Webhook] Update failed:', updateError)
          return NextResponse.json({ error: 'Update failed' }, { status: 500 })
        }

        console.log('[Stripe Webhook] Payment updated:', {
          paymentId: payment.id,
          status: 'paid'
        })

        // 지정 예약인 경우 자동으로 confirmed 상태로 변경
        if (payment.booking) {
          const booking = Array.isArray(payment.booking) ? payment.booking[0] : payment.booking

          if (booking.booking_type === 'direct' && booking.status === 'pending') {
            const { error: bookingUpdateError } = await supabase
              .from('bookings')
              .update({ status: 'confirmed' })
              .eq('id', booking.id)

            if (bookingUpdateError) {
              console.error('[Stripe Webhook] Booking status update failed:', bookingUpdateError)
            } else {
              console.log('[Stripe Webhook] Direct booking auto-confirmed:', booking.id)
            }
          }
        }

        // Trainer에게 알림 전송
        if (payment.booking) {
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

            console.log('[Stripe Webhook] Notification sent to trainer:', trainerProfile.id)
          }
        }

        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session

        console.log('[Stripe Webhook] Session expired:', session.id)

        const { error } = await supabase
          .from('payments')
          .update({
            payment_status: 'cancelled',
            payment_metadata: {
              webhook: {
                eventType: event.type,
                eventId: event.id,
                receivedAt: new Date().toISOString()
              }
            }
          })
          .eq('payment_metadata->>stripeSessionId', session.id)

        if (error) {
          console.error('[Stripe Webhook] Expire update failed:', error)
        }

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        console.log('[Stripe Webhook] Payment failed:', paymentIntent.id)

        const { error } = await supabase
          .from('payments')
          .update({
            payment_status: 'failed',
            payment_metadata: {
              webhook: {
                eventType: event.type,
                eventId: event.id,
                receivedAt: new Date().toISOString(),
                failureMessage: paymentIntent.last_payment_error?.message
              }
            }
          })
          .eq('payment_metadata->>stripePaymentIntentId', paymentIntent.id)

        if (error) {
          console.error('[Stripe Webhook] Failed update error:', error)
        }

        break
      }

      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('[Stripe Webhook] Processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
