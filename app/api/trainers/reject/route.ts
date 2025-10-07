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

    const { trainerId, rejectionReason } = await request.json()

    if (!trainerId || !rejectionReason) {
      return NextResponse.json(
        { error: 'Trainer ID and rejection reason are required' },
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

    // 트레이너 거절 처리 (is_verified는 false로 유지, is_active를 false로 변경)
    const { data, error } = await supabase
      .from('trainers')
      .update({
        is_verified: false,
        is_active: false
      })
      .eq('id', trainerId)
      .select()
      .single()

    if (error) {
      throw error
    }

    // 트레이너에게 알림 전송
    await supabase.from('notifications').insert({
      user_id: trainer.profile_id,
      type: 'trainer_approval_rejected',
      title: '트레이너 승인 거절',
      message: `안타깝게도 트레이너 승인이 거절되었습니다. 사유: ${rejectionReason}`,
      link: '/trainer/profile',
    })

    return NextResponse.json({
      success: true,
      message: 'Trainer rejected',
      trainer: data,
    })
  } catch (error) {
    console.error('Error rejecting trainer:', error)
    return NextResponse.json(
      { error: 'Failed to reject trainer' },
      { status: 500 }
    )
  }
}
