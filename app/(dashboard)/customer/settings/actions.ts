'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateCustomerProfile(formData: FormData) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: '로그인이 필요합니다.' }
  }

  // Extract form data
  const fullName = formData.get('full_name') as string
  const phone = formData.get('phone') as string
  const age = formData.get('age') as string
  const gender = formData.get('gender') as string
  const address = formData.get('address') as string
  const addressDetail = formData.get('address_detail') as string
  const emergencyContact = formData.get('emergency_contact') as string
  const emergencyPhone = formData.get('emergency_phone') as string
  const mobilityLevel = formData.get('mobility_level') as string
  const notes = formData.get('notes') as string

  // Validate required fields
  if (!fullName) {
    return { error: '이름은 필수 항목입니다.' }
  }

  try {
    // 1. Update profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone: phone || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      return { error: '프로필 업데이트 중 오류가 발생했습니다.' }
    }

    // 2. Get customer.id from customers table (docs/DATABASE_SCHEMA.md 참조)
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!customer) {
      return { error: '고객 정보를 찾을 수 없습니다.' }
    }

    // 3. Update customers table
    const { error: customerError } = await supabase
      .from('customers')
      .update({
        age: age ? parseInt(age) : null,
        gender: gender || null,
        address: address || null,
        address_detail: addressDetail || null,
        emergency_contact: emergencyContact || null,
        emergency_phone: emergencyPhone || null,
        mobility_level: mobilityLevel || null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', customer.id)

    if (customerError) {
      console.error('Customer update error:', customerError)
      return { error: '고객 정보 업데이트 중 오류가 발생했습니다.' }
    }

    // Revalidate pages
    revalidatePath('/customer/settings')
    revalidatePath('/customer/dashboard')

    return { success: true }

  } catch (error) {
    console.error('Update profile error:', error)
    return { error: '프로필 업데이트 중 오류가 발생했습니다.' }
  }
}
