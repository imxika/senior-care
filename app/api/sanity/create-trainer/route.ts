import { createClient } from '@/lib/supabase/server'
import { sanityWriteClient } from '@/lib/sanity/client'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 관리자 권한 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 프로필에서 user_type 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 })
    }

    const { trainerId } = await request.json()

    if (!trainerId) {
      return NextResponse.json({ error: 'Trainer ID is required' }, { status: 400 })
    }

    // Supabase에서 트레이너 정보 가져오기
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .select(`
        *,
        profiles!trainers_profile_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq('id', trainerId)
      .single()

    if (trainerError || !trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 })
    }

    // Sanity에 이미 존재하는지 확인
    const existingDoc = await sanityWriteClient.fetch(
      `*[_type == "trainerProfile" && supabaseId == $trainerId][0]`,
      { trainerId }
    )

    if (existingDoc) {
      return NextResponse.json(
        { error: 'Trainer already exists in Sanity', sanityId: existingDoc._id },
        { status: 400 }
      )
    }

    // Sanity 문서 생성
    const sanityDoc = await sanityWriteClient.create({
      _type: 'trainerProfile',
      supabaseId: trainer.id,
      name: trainer.profiles.full_name,
      shortBio: trainer.bio || '',
      specializations: trainer.specializations || [],
      slug: {
        _type: 'slug',
        current: `trainer-${trainer.id}`,
      },
      isActive: true,
      publishedAt: new Date().toISOString(),
      displayOrder: 999, // 관리자가 나중에 변경 가능
    })

    return NextResponse.json({
      success: true,
      message: 'Trainer profile created in Sanity',
      sanityId: sanityDoc._id,
      supabaseId: trainerId,
    })
  } catch (error) {
    console.error('Error creating trainer in Sanity:', error)
    return NextResponse.json(
      { error: 'Failed to create trainer in Sanity' },
      { status: 500 }
    )
  }
}
