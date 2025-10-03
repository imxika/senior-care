'use server'

import { createClient } from '@/lib/supabase/server'

export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { user: null, userType: null }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

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
