import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 관리자 권한 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 })
    }

    const { trainerId, isVerified } = await request.json()

    if (!trainerId || typeof isVerified !== 'boolean') {
      return NextResponse.json(
        { error: 'Trainer ID and isVerified are required' },
        { status: 400 }
      )
    }

    // 트레이너 승인 상태 업데이트
    const { data, error } = await supabase
      .from('trainers')
      .update({ is_verified: isVerified })
      .eq('id', trainerId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: isVerified ? 'Trainer verified' : 'Trainer unverified',
      trainer: data,
    })
  } catch (error) {
    console.error('Error verifying trainer:', error)
    return NextResponse.json(
      { error: 'Failed to verify trainer' },
      { status: 500 }
    )
  }
}
