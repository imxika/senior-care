'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateCustomerProfile(formData: FormData) {
  const supabase = await createClient()

  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '인증되지 않은 사용자입니다.' }
  }

  // profiles 테이블 업데이트
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: formData.get('full_name') as string,
      phone: formData.get('phone') as string,
    })
    .eq('id', user.id)

  if (profileError) {
    return { error: profileError.message }
  }

  // customers 테이블 업데이트
  const { error: customerError } = await supabase
    .from('customers')
    .update({
      birth_date: formData.get('birth_date') as string || null,
      gender: formData.get('gender') as string || null,
      address: formData.get('address') as string || null,
      address_detail: formData.get('address_detail') as string || null,
      guardian_name: formData.get('guardian_name') as string || null,
      guardian_relationship: formData.get('guardian_relationship') as string || null,
      guardian_phone: formData.get('guardian_phone') as string || null,
      mobility_level: formData.get('mobility_level') as string || null,
      notes: formData.get('notes') as string || null,
    })
    .eq('profile_id', user.id)

  if (customerError) {
    return { error: customerError.message }
  }

  // 페이지 갱신
  revalidatePath('/customer/settings/profile')

  return { success: true }
}
