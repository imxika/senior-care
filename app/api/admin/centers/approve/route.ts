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
    const { centerId } = await request.json()

    if (!centerId) {
      return NextResponse.json({ error: '센터 ID가 필요합니다' }, { status: 400 })
    }

    // 센터 승인 처리
    const { data: center, error: updateError } = await supabase
      .from('centers')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        verified_by: user.id,
      })
      .eq('id', centerId)
      .select()
      .single()

    if (updateError) {
      console.error('센터 승인 오류:', updateError)
      return NextResponse.json(
        { error: `센터 승인에 실패했습니다: ${updateError.message}` },
        { status: 500 }
      )
    }

    // TODO: 트레이너에게 승인 알림 전송
    // const { data: ownerData } = await supabase
    //   .from('trainers')
    //   .select('profile:profiles!profile_id(email, full_name)')
    //   .eq('id', center.owner_id)
    //   .single()

    return NextResponse.json({
      success: true,
      message: '센터가 승인되었습니다',
      center,
    })
  } catch (error) {
    console.error('센터 승인 처리 오류:', error)
    return NextResponse.json(
      { error: '센터 승인 처리 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
