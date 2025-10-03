import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  try {
    // 1. 먼저 모든 프로필 확인
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_type', 'trainer')

    console.log('Trainer profiles:', profiles)

    // 2. 모든 트레이너 확인
    const { data: allTrainers, error: allError } = await supabase
      .from('trainers')
      .select('*')

    console.log('All trainers:', allTrainers)
    console.log('All trainers error:', allError)

    // 3. 승인된 트레이너만 확인
    const { data: verifiedTrainers, error: verifiedError } = await supabase
      .from('trainers')
      .select(`
        *,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .eq('is_verified', true)
      .eq('is_active', true)

    console.log('Verified trainers:', verifiedTrainers)
    console.log('Verified trainers error:', verifiedError)

    return NextResponse.json({
      profiles: profiles?.length || 0,
      allTrainers: allTrainers?.length || 0,
      verifiedTrainers: verifiedTrainers?.length || 0,
      data: {
        profiles,
        allTrainers,
        verifiedTrainers,
      },
      errors: {
        allError,
        verifiedError,
      }
    })
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// 테스트 트레이너 생성
export async function POST() {
  const supabase = await createClient()

  try {
    // 관리자 확인
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 테스트 프로필 생성
    const testProfileId = crypto.randomUUID()

    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: testProfileId,
        user_type: 'trainer',
        full_name: '테스트 트레이너',
        phone: '010-1234-5678',
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: profileError }, { status: 500 })
    }

    // 테스트 트레이너 생성
    const { data: newTrainer, error: trainerError } = await supabase
      .from('trainers')
      .insert({
        profile_id: testProfileId,
        bio: '테스트용 트레이너입니다.',
        specialties: ['재활 훈련', '근력 강화', '균형 운동'],
        certifications: ['물리치료사'],
        years_experience: 5,
        rating: 4.8,
        total_reviews: 10,
        hourly_rate: 50000,
        home_visit_available: true,
        center_visit_available: true,
        service_areas: ['서울', '경기'],
        is_verified: true,
        is_active: true,
      })
      .select()
      .single()

    if (trainerError) {
      console.error('Trainer error:', trainerError)
      return NextResponse.json({ error: trainerError }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      profile: newProfile,
      trainer: newTrainer,
    })
  } catch (error) {
    console.error('POST error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
