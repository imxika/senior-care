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
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 })
    }

    const { trainerId, isVerified } = await request.json()

    if (!trainerId || typeof isVerified !== 'boolean') {
      return NextResponse.json(
        { error: 'Trainer ID and isVerified are required' },
        { status: 400 }
      )
    }

    // 트레이너 정보 조회 (알림 발송용)
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .select('profile_id, profiles!trainers_profile_id_fkey(full_name)')
      .eq('id', trainerId)
      .single()

    if (trainerError || !trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 })
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

    // 승인 시 트레이너에게 알림 전송
    if (isVerified) {
      await supabase.from('notifications').insert({
        user_id: trainer.profile_id,
        type: 'trainer_approval_approved',
        title: '트레이너 승인 완료',
        message: `축하합니다! 트레이너로 승인되었습니다. 이제 예약을 받을 수 있습니다.`,
        link: '/trainer/dashboard',
      })
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
