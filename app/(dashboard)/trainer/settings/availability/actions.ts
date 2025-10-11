'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface TimeSlot {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
}

/**
 * 트레이너 활성화/비활성화 토글
 */
export async function toggleTrainerAvailability(trainerId: string, isAvailable: boolean) {
  try {
    const supabase = await createClient()

    // 트레이너 소유권 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Unauthorized - 로그인이 필요합니다' }
    }

    const { data: trainer } = await supabase
      .from('trainers')
      .select('id, profile_id')
      .eq('id', trainerId)
      .single()

    if (!trainer || trainer.profile_id !== user.id) {
      return { error: 'Forbidden - 본인의 프로필만 수정할 수 있습니다' }
    }

    // 활성화 상태 업데이트
    const { error } = await supabase
      .from('trainers')
      .update({ is_available: isAvailable })
      .eq('id', trainerId)

    if (error) {
      console.error('Toggle availability error:', error)
      return { error: '활성화 상태 변경에 실패했습니다' }
    }

    revalidatePath('/trainer/settings/availability')
    return { success: true }

  } catch (error) {
    console.error('Unexpected error:', error)
    return { error: '예상치 못한 오류가 발생했습니다' }
  }
}

/**
 * 날짜별 예외 추가/수정
 */
export async function upsertAvailabilityException(data: {
  trainerId: string
  date: string
  isAvailable: boolean
  timeSlots?: string[]
  reason?: string
}) {
  try {
    const supabase = await createClient()

    // 트레이너 소유권 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Unauthorized - 로그인이 필요합니다' }
    }

    const { data: trainer } = await supabase
      .from('trainers')
      .select('id, profile_id')
      .eq('id', data.trainerId)
      .single()

    if (!trainer || trainer.profile_id !== user.id) {
      return { error: 'Forbidden - 본인의 예외만 설정할 수 있습니다' }
    }

    // 날짜 검증 (과거 날짜 불가)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const exceptionDate = new Date(data.date)
    exceptionDate.setHours(0, 0, 0, 0)

    if (exceptionDate < today) {
      return { error: '과거 날짜는 설정할 수 없습니다' }
    }

    // UPSERT (INSERT or UPDATE)
    const { error } = await supabase
      .from('trainer_availability_exceptions')
      .upsert({
        trainer_id: data.trainerId,
        date: data.date,
        is_available: data.isAvailable,
        time_slots: data.timeSlots || null,
        reason: data.reason || null,
      }, {
        onConflict: 'trainer_id,date'
      })

    if (error) {
      console.error('Upsert exception error:', error)
      return { error: '예외 설정에 실패했습니다' }
    }

    revalidatePath('/trainer/settings/availability')
    return { success: true }

  } catch (error) {
    console.error('Unexpected error:', error)
    return { error: '예상치 못한 오류가 발생했습니다' }
  }
}

/**
 * 날짜별 예외 삭제
 */
export async function deleteAvailabilityException(exceptionId: string) {
  try {
    const supabase = await createClient()

    // 트레이너 소유권 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Unauthorized - 로그인이 필요합니다' }
    }

    // 예외 조회 및 소유권 확인
    const { data: exception } = await supabase
      .from('trainer_availability_exceptions')
      .select(`
        id,
        trainer_id,
        trainers!inner(profile_id)
      `)
      .eq('id', exceptionId)
      .single()

    if (!exception) {
      return { error: '예외를 찾을 수 없습니다' }
    }

    // @ts-expect-error - Supabase JOIN 타입 이슈
    if (exception.trainers.profile_id !== user.id) {
      return { error: 'Forbidden - 본인의 예외만 삭제할 수 있습니다' }
    }

    // 삭제
    const { error } = await supabase
      .from('trainer_availability_exceptions')
      .delete()
      .eq('id', exceptionId)

    if (error) {
      console.error('Delete exception error:', error)
      return { error: '예외 삭제에 실패했습니다' }
    }

    revalidatePath('/trainer/settings/availability')
    return { success: true }

  } catch (error) {
    console.error('Unexpected error:', error)
    return { error: '예상치 못한 오류가 발생했습니다' }
  }
}

/**
 * 기본 가능시간 저장 (trainer_availability 테이블)
 */
export async function saveWeeklyAvailability(trainerId: string, timeSlots: TimeSlot[]) {
  try {
    const supabase = await createClient()

    // 트레이너 소유권 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Unauthorized - 로그인이 필요합니다' }
    }

    const { data: trainer } = await supabase
      .from('trainers')
      .select('id, profile_id')
      .eq('id', trainerId)
      .single()

    if (!trainer || trainer.profile_id !== user.id) {
      return { error: 'Forbidden - 본인의 스케줄만 수정할 수 있습니다' }
    }

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
      return { error: '가능시간 저장에 실패했습니다' }
    }

    revalidatePath('/trainer/settings/availability')
    return { success: true, data }

  } catch (error) {
    console.error('Unexpected error:', error)
    return { error: '예상치 못한 오류가 발생했습니다' }
  }
}

/**
 * 개별 가능시간 삭제
 */
export async function deleteWeeklyAvailability(availabilityId: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('trainer_availability')
      .update({ is_active: false })
      .eq('id', availabilityId)

    if (error) {
      console.error('Error deleting availability:', error)
      return { error: '삭제에 실패했습니다' }
    }

    revalidatePath('/trainer/settings/availability')
    return { success: true }

  } catch (error) {
    console.error('Unexpected error:', error)
    return { error: '예상치 못한 오류가 발생했습니다' }
  }
}
