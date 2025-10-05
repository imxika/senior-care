'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateTrainerNotes(formData: FormData) {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  // 트레이너 정보 확인
  const { data: trainer } = await supabase
    .from('trainers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!trainer) {
    return { error: '트레이너 정보를 찾을 수 없습니다.' }
  }

  const bookingId = formData.get('booking_id') as string
  const trainerNotes = formData.get('trainer_notes') as string
  const sessionSummary = formData.get('session_summary') as string

  // 예약이 해당 트레이너의 것인지 확인
  const { data: booking } = await supabase
    .from('bookings')
    .select('id')
    .eq('id', bookingId)
    .eq('trainer_id', trainer.id)
    .single()

  if (!booking) {
    return { error: '예약 정보를 찾을 수 없거나 권한이 없습니다.' }
  }

  // 메모 업데이트
  const { error } = await supabase
    .from('bookings')
    .update({
      trainer_notes: trainerNotes || null,
      session_summary: sessionSummary || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)

  if (error) {
    console.error('Error updating trainer notes:', error)
    return { error: '메모 저장 중 오류가 발생했습니다.' }
  }

  // 페이지 새로고침
  revalidatePath(`/trainer/bookings/${bookingId}`)
  revalidatePath('/trainer/bookings')

  return { success: true }
}
