import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    // 요청 데이터 파싱
    const { centerId, reason } = await request.json()

    if (!centerId) {
      return NextResponse.json({ error: '센터 ID가 필요합니다' }, { status: 400 })
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: '거부 사유가 필요합니다' }, { status: 400 })
    }

    // 센터 정보 조회 (알림 전송용)
    const { data: center } = await supabase
      .from('centers')
      .select('id, name, owner_id')
      .eq('id', centerId)
      .single()

    if (!center) {
      return NextResponse.json({ error: '센터를 찾을 수 없습니다' }, { status: 404 })
    }

    // TODO: 거부 사유를 트레이너에게 알림으로 전송
    // const { data: ownerData } = await supabase
    //   .from('trainers')
    //   .select('profile:profiles!profile_id(email, full_name)')
    //   .eq('id', center.owner_id)
    //   .single()

    // 센터 삭제
    const { error: deleteError } = await supabase
      .from('centers')
      .delete()
      .eq('id', centerId)

    if (deleteError) {
      console.error('센터 삭제 오류:', deleteError)
      return NextResponse.json(
        { error: `센터 삭제에 실패했습니다: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '센터가 거부되었습니다',
      reason,
    })
  } catch (error) {
    console.error('센터 거부 처리 오류:', error)
    return NextResponse.json(
      { error: '센터 거부 처리 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
