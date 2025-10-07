'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { user: null, userType: null }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', {
        error: profileError,
        userId: user.id,
        email: user.email
      })
    }

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      userType: profile?.user_type || null
    }
  } catch (error) {
    console.error('getCurrentUser error:', error)
    return { user: null, userType: null }
  }
}

export async function signOut() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Sign out error:', error)
    return { error: '로그아웃 중 오류가 발생했습니다.' }
  }

  redirect('/login')
}
