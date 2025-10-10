import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/bookings/[bookingId]/cancel-pending
 * 결제 대기 중인 예약을 취소(삭제)합니다
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params
    const supabase = await createClient()

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log(`🗑️ [CANCEL PENDING] User ${user.id} canceling booking ${bookingId}`)

    // 2. 고객 정보 가져오기
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (customerError || !customer) {
      console.error('❌ [CANCEL PENDING] Customer not found:', customerError)
      return NextResponse.json(
        { error: '고객 정보를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 3. 예약 정보 확인
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, customer_id, status')
      .eq('id', bookingId)
      .eq('customer_id', customer.id)
      .single()

    if (bookingError || !booking) {
      console.error('❌ [CANCEL PENDING] Booking not found:', bookingError)
      return NextResponse.json(
        { error: '예약을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 4. 상태 확인 - pending_payment만 삭제 가능
    if (booking.status !== 'pending_payment') {
      console.error(`❌ [CANCEL PENDING] Invalid status: ${booking.status}`)
      return NextResponse.json(
        { error: `결제 대기 중인 예약만 취소할 수 있습니다 (현재 상태: ${booking.status})` },
        { status: 400 }
      )
    }

    // 5. 연관된 결제 정보 삭제 (있다면)
    const { error: paymentDeleteError } = await supabase
      .from('payments')
      .delete()
      .eq('booking_id', bookingId)

    if (paymentDeleteError) {
      console.error('⚠️ [CANCEL PENDING] Payment deletion error (continuing):', paymentDeleteError)
    } else {
      console.log('✅ [CANCEL PENDING] Associated payments deleted')
    }

    // 6. 예약 삭제
    const { error: bookingDeleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)
      .eq('customer_id', customer.id)

    if (bookingDeleteError) {
      console.error('❌ [CANCEL PENDING] Booking deletion failed:', bookingDeleteError)
      return NextResponse.json(
        { error: '예약 삭제에 실패했습니다' },
        { status: 500 }
      )
    }

    console.log('✅ [CANCEL PENDING] Booking deleted successfully')

    return NextResponse.json({
      success: true,
      message: '예약이 취소되었습니다'
    })

  } catch (error) {
    console.error('❌ [CANCEL PENDING] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
