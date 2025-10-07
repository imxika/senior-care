'use server'

import { createClient } from '@supabase/supabase-js'

// Service role client (RLS 우회)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function createProfile(
  userId: string,
  email: string,
  data: { full_name: string; user_type: string }
) {
  try {
    console.log('=== Creating profile for user:', userId, email, data)

    // 프로필 생성
    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        full_name: data.full_name,
        user_type: data.user_type,
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile create error:', profileError)
      return { error: `프로필 생성 실패: ${profileError.message}` }
    }

    console.log('Profile created:', newProfile)

    // customer/trainer 레코드 생성
    if (data.user_type === 'customer') {
      const { error: customerError } = await supabaseAdmin
        .from('customers')
        .insert({ profile_id: userId })
      if (customerError) console.error('Customer create error:', customerError)
    } else if (data.user_type === 'trainer') {
      const { error: trainerError } = await supabaseAdmin
        .from('trainers')
        .insert({ profile_id: userId })
      if (trainerError) console.error('Trainer create error:', trainerError)
    }

    console.log('=== Profile creation completed successfully')
    return { success: true }

  } catch (error) {
    console.error('Create profile error:', error)
    return { error: error instanceof Error ? error.message : '알 수 없는 오류' }
  }
}

export async function updateUser(
  userId: string,
  data: { full_name: string; user_type: string }
) {
  try {
    console.log('=== Starting update for user:', userId, data)

    // 프로필 존재 확인
    const { data: profile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, user_type')
      .eq('id', userId)
      .single()

    if (checkError) {
      console.error('Profile check error:', checkError)
      return { error: `프로필을 찾을 수 없습니다: ${checkError.message}` }
    }

    console.log('Current profile:', profile)

    // profiles 테이블 업데이트
    const { data: updated, error } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: data.full_name,
        user_type: data.user_type,
      })
      .eq('id', userId)
      .select()

    if (error) {
      console.error('Update error:', error)
      return { error: `업데이트 실패: ${error.message}` }
    }

    console.log('Updated profile:', updated)

    // user_type이 변경되었으면 customer/trainer 레코드도 처리
    if (profile.user_type !== data.user_type) {
      console.log('User type changed from', profile.user_type, 'to', data.user_type)

      // 이전 타입의 레코드 삭제
      if (profile.user_type === 'customer') {
        const { error: delError } = await supabaseAdmin
          .from('customers')
          .delete()
          .eq('profile_id', userId)
        if (delError) console.error('Customer delete error:', delError)
      } else if (profile.user_type === 'trainer') {
        const { error: delError } = await supabaseAdmin
          .from('trainers')
          .delete()
          .eq('profile_id', userId)
        if (delError) console.error('Trainer delete error:', delError)
      }

      // 새 타입의 레코드 생성
      if (data.user_type === 'customer') {
        const { error: insertError } = await supabaseAdmin
          .from('customers')
          .insert({ profile_id: userId })
        if (insertError) console.error('Customer insert error:', insertError)
      } else if (data.user_type === 'trainer') {
        const { error: insertError } = await supabaseAdmin
          .from('trainers')
          .insert({ profile_id: userId })
        if (insertError) console.error('Trainer insert error:', insertError)
      }
    }

    console.log('=== Update completed successfully')
    return { success: true }

  } catch (error) {
    console.error('Update user error:', error)
    return { error: error instanceof Error ? error.message : '알 수 없는 오류' }
  }
}

export async function deleteUserCompletely(userId: string, email: string) {
  try {
    console.log('=== Starting deletion for user:', userId, email)

    // 프로필 존재 여부 확인
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('Profile check error:', profileError)
      // 에러가 있어도 계속 진행 (프로필이 없을 수도 있음)
    }

    if (profile) {
      console.log('Profile exists, deleting related data...')

      // 1. customer_id 찾기
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('profile_id', userId)
        .maybeSingle()

      if (customer) {
        console.log('Deleting customer data...')

        // 2. reviews 삭제
        const { error: reviewsError } = await supabaseAdmin
          .from('reviews')
          .delete()
          .eq('customer_id', customer.id)
        if (reviewsError) console.error('Reviews delete error:', reviewsError)

        // 3. customer_addresses 삭제
        const { error: addressesError } = await supabaseAdmin
          .from('customer_addresses')
          .delete()
          .eq('customer_id', customer.id)
        if (addressesError) console.error('Addresses delete error:', addressesError)

        // 4. bookings 삭제
        const { error: bookingsError } = await supabaseAdmin
          .from('bookings')
          .delete()
          .eq('customer_id', customer.id)
        if (bookingsError) console.error('Bookings delete error:', bookingsError)

        // 5. customers 삭제
        const { error: customerError } = await supabaseAdmin
          .from('customers')
          .delete()
          .eq('id', customer.id)
        if (customerError) console.error('Customer delete error:', customerError)
      }

      // 6. trainer_id 찾기
      const { data: trainer } = await supabaseAdmin
        .from('trainers')
        .select('id')
        .eq('profile_id', userId)
        .maybeSingle()

      if (trainer) {
        console.log('Deleting trainer data...')
        const { error: trainerError } = await supabaseAdmin
          .from('trainers')
          .delete()
          .eq('id', trainer.id)
        if (trainerError) console.error('Trainer delete error:', trainerError)
      }

      // 7. notifications 삭제
      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('user_id', userId)
      if (notifError) console.error('Notifications delete error:', notifError)

      // 8. profile 삭제
      console.log('Deleting profile...')
      const { error: profileDelError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId)
      if (profileDelError) {
        console.error('Profile delete error:', profileDelError)
        return { error: `프로필 삭제 실패: ${profileDelError.message}` }
      }
    } else {
      console.log('No profile found, only deleting auth.users')
    }

    // 9. auth.users에서 삭제 (가장 중요!)
    console.log('Deleting from auth.users...')
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Auth delete error:', authError)
      return { error: `Auth 삭제 실패: ${authError.message}` }
    }

    console.log('=== User deletion completed successfully')
    return { success: true }

  } catch (error) {
    console.error('Delete user error:', error)
    return { error: error instanceof Error ? error.message : '알 수 없는 오류' }
  }
}
