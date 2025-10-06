'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CancellationReason } from '@/lib/constants'
import { calculateCancellationFee } from '@/lib/utils'

export async function cancelBooking(
  bookingId: string,
  reason: CancellationReason,
  notes?: string
) {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  // 고객 정보 확인
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!customer) {
    return { error: '고객 정보를 찾을 수 없습니다.' }
  }

  // 예약 정보 조회
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('customer_id', customer.id)
    .single()

  if (bookingError || !booking) {
    return { error: '예약 정보를 찾을 수 없습니다.' }
  }

  // 이미 취소된 예약인지 확인
  if (booking.status === 'cancelled') {
    return { error: '이미 취소된 예약입니다.' }
  }

  // 완료된 예약은 취소 불가
  if (booking.status === 'completed') {
    return { error: '완료된 예약은 취소할 수 없습니다.' }
  }

  // 취소 수수료 계산
  const cancellationInfo = calculateCancellationFee(
    booking.total_price,
    booking.booking_date,
    booking.start_time
  )

  // 취소 사유 및 수수료 정보를 customer_notes에 추가
  const cancellationDetails = `
[취소 정보]
취소 사유: ${reason}
${notes ? `상세 사유: ${notes}\n` : ''}취소 시기: ${cancellationInfo.timeCategory}
취소 수수료: ${cancellationInfo.feeAmount.toLocaleString()}원 (${(cancellationInfo.feeRate * 100).toFixed(0)}%)
환불 금액: ${cancellationInfo.refundAmount.toLocaleString()}원
취소 일시: ${new Date().toLocaleString('ko-KR')}
`

  const updatedNotes = booking.customer_notes
    ? `${booking.customer_notes}\n\n${cancellationDetails}`
    : cancellationDetails

  // 예약 상태를 cancelled로 변경
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      customer_notes: updatedNotes,
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)

  if (updateError) {
    console.error('Failed to cancel booking:', updateError)
    return { error: '예약 취소에 실패했습니다.' }
  }

  // 트레이너에게 알림 전송 (트레이너가 배정된 경우만)
  if (booking.trainer_id) {
    const { data: trainer } = await supabase
      .from('trainers')
      .select('profile_id')
      .eq('id', booking.trainer_id)
      .single()

    if (trainer) {
      await supabase.from('notifications').insert({
        user_id: trainer.profile_id,
        title: '예약 취소 알림',
        message: `고객이 ${booking.booking_date} ${booking.start_time.slice(0, 5)} 예약을 취소했습니다.\n취소 사유: ${reason}`,
        type: 'booking_cancelled',
        link: `/trainer/bookings/${bookingId}`,
        is_read: false
      })
    }
  }

  // 페이지 재검증
  revalidatePath(`/customer/bookings/${bookingId}`)
  revalidatePath('/customer/bookings')

  return {
    success: true,
    refundAmount: cancellationInfo.refundAmount,
    feeAmount: cancellationInfo.feeAmount
  }
}
