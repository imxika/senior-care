import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')
    const customerId = searchParams.get('id')

    if (!email && !customerId) {
      return NextResponse.json(
        { error: '이메일 또는 고객 ID를 입력하세요' },
        { status: 400 }
      )
    }

    // 관리자 또는 트레이너 권한 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'trainer'].includes(profile.user_type)) {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    // 고객 검색
    let query = supabase
      .from('customers')
      .select(`
        id,
        profiles!customers_profile_id_fkey(
          id,
          full_name,
          email,
          phone
        )
      `)

    if (customerId) {
      query = query.eq('id', customerId)
    } else if (email) {
      query = query.eq('profiles.email', email)
    }

    const { data: customers, error } = await query

    if (error) {
      console.error('Customer search error:', error)
      return NextResponse.json(
        { error: '고객 검색 중 오류가 발생했습니다' },
        { status: 500 }
      )
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({ customer: null })
    }

    const customer = customers[0]
    const customerProfile = customer.profiles as any

    return NextResponse.json({
      customer: {
        id: customer.id,
        full_name: customerProfile?.full_name,
        email: customerProfile?.email,
        phone: customerProfile?.phone,
      }
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
