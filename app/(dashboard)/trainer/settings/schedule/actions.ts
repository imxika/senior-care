'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface TimeSlot {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
}

export async function saveAvailability(trainerId: string, timeSlots: TimeSlot[]) {
  const supabase = await createClient()

  try {
    // 기존 데이터 모두 비활성화
    await supabase
      .from('trainer_availability')
      .update({ is_active: false })
      .eq('trainer_id', trainerId)

    // 새 데이터 삽입
    const { data, error } = await supabase
      .from('trainer_availability')
      .upsert(
        timeSlots.map(slot => ({
          ...(slot.id && { id: slot.id }),
          trainer_id: trainerId,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_active: true
        })),
        { onConflict: 'id' }
      )
      .select()

    if (error) {
      console.error('Error saving availability:', error)
      return { error: error.message }
    }

    revalidatePath('/trainer/availability')
    return { data }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { error: '저장 중 오류가 발생했습니다.' }
  }
}

export async function deleteAvailability(availabilityId: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('trainer_availability')
      .update({ is_active: false })
      .eq('id', availabilityId)

    if (error) {
      console.error('Error deleting availability:', error)
      return { error: error.message }
    }

    revalidatePath('/trainer/availability')
    return { success: true }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { error: '삭제 중 오류가 발생했습니다.' }
  }
}
