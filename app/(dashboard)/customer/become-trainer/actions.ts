'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function becomeTrainer(userId: string) {
  const supabase = await createClient()

  try {
    // 1. 프로필 user_type을 trainer로 변경
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        user_type: 'trainer',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Profile update error:', profileError)
      return { error: '프로필 업데이트 중 오류가 발생했습니다.' }
    }

    // 2. trainers 테이블에 레코드 생성 (기본값으로)
    const { error: trainerError } = await supabase
      .from('trainers')
      .insert({
        profile_id: userId,
        bio: '안녕하세요. 시니어 재활 전문 트레이너입니다.',
        hourly_rate: 100000, // 기본 시급 10만원
        home_visit_available: true,
        center_visit_available: true,
        max_group_size: 4,
        is_available: true
      })

    if (trainerError) {
      console.error('Trainer creation error:', trainerError)

      // 프로필 롤백
      await supabase
        .from('profiles')
        .update({
          user_type: 'customer',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      return { error: '트레이너 계정 생성 중 오류가 발생했습니다.' }
    }

    // 3. 경로 재검증
    revalidatePath('/customer')
    revalidatePath('/trainer')

    return { success: true }
  } catch (error) {
    console.error('Become trainer error:', error)
    return { error: '트레이너 전환 중 오류가 발생했습니다.' }
  }
}
