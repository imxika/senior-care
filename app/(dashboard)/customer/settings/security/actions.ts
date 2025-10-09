'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '인증이 필요합니다' }
  }

  const currentPassword = formData.get('current_password') as string
  const newPassword = formData.get('new_password') as string

  // 유효성 검사
  if (!currentPassword || !newPassword) {
    return { error: '모든 필드를 입력해주세요' }
  }

  if (newPassword.length < 8) {
    return { error: '새 비밀번호는 최소 8자 이상이어야 합니다' }
  }

  // 현재 비밀번호 확인을 위해 재인증 시도
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })

  if (signInError) {
    return { error: '현재 비밀번호가 올바르지 않습니다' }
  }

  // 새 비밀번호로 업데이트
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    console.error('비밀번호 업데이트 오류:', updateError)
    return { error: '비밀번호 변경에 실패했습니다' }
  }

  revalidatePath('/customer/settings/security')
  return { success: true }
}
