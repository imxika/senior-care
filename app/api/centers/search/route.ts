import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
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

    // 검색어 파라미터
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''

    // 승인된 센터만 가져오기
    const { data: centers, error } = await supabase
      .from('centers')
      .select('id, name, address, business_registration_number')
      .eq('is_verified', true)
      .order('name')
      .limit(100) // 클라이언트에서 필터링할 것이므로 더 많이 가져옴

    if (error) {
      console.error('센터 조회 오류:', error)
      return NextResponse.json(
        { error: `센터 조회에 실패했습니다: ${error.message}` },
        { status: 500 }
      )
    }

    // 클라이언트 사이드에서 검색 필터링 (이름, UUID 앞 6자리, 사업자번호)
    let filteredCenters = centers || []
    if (query.trim()) {
      const searchLower = query.toLowerCase()
      filteredCenters = filteredCenters.filter((center) => {
        const nameMatch = center.name?.toLowerCase().includes(searchLower)
        const idMatch = center.id?.toLowerCase().includes(searchLower)
        const businessMatch = center.business_registration_number?.toLowerCase().includes(searchLower)
        return nameMatch || idMatch || businessMatch
      })
    }

    // 상위 20개만 반환
    const limitedCenters = filteredCenters.slice(0, 20)

    return NextResponse.json({ centers: limitedCenters })
  } catch (error) {
    console.error('센터 검색 처리 오류:', error)
    return NextResponse.json(
      { error: '센터 검색 처리 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
