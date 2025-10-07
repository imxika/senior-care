import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PUT - 트레이너가 리뷰에 답글 작성/수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    console.log('[PUT /api/reviews/[id]/response] User:', user?.id, 'ReviewId:', reviewId)

    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다' }, { status: 401 })
    }

    const { response } = await request.json()
    console.log('[PUT /api/reviews/[id]/response] Response:', response)

    // 트레이너 정보 확인
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    console.log('[PUT /api/reviews/[id]/response] Trainer:', trainer, 'Error:', trainerError)

    if (!trainer) {
      return NextResponse.json({ error: '트레이너 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    // 리뷰 정보 확인 (해당 트레이너의 리뷰인지)
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, trainer_id')
      .eq('id', reviewId)
      .single()

    console.log('[PUT /api/reviews/[id]/response] Review:', review, 'Error:', reviewError)

    if (!review) {
      return NextResponse.json({ error: '리뷰를 찾을 수 없습니다' }, { status: 404 })
    }

    if (review.trainer_id !== trainer.id) {
      return NextResponse.json({ error: '본인의 리뷰에만 답글을 작성할 수 있습니다' }, { status: 403 })
    }

    // 답글 업데이트
    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update({
        trainer_response: response || null,
        trainer_response_at: response ? new Date().toISOString() : null,
      })
      .eq('id', reviewId)
      .select()
      .single()

    console.log('[PUT /api/reviews/[id]/response] Updated:', updatedReview, 'Error:', updateError)

    if (updateError) {
      console.error('Review response update error:', updateError)
      return NextResponse.json({ error: `답글 저장에 실패했습니다: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({ review: updatedReview })
  } catch (error: any) {
    console.error('PUT /api/reviews/[id]/response error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// DELETE - 트레이너가 작성한 답글 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다' }, { status: 401 })
    }

    // 트레이너 정보 확인
    const { data: trainer } = await supabase
      .from('trainers')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!trainer) {
      return NextResponse.json({ error: '트레이너 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    // 답글 삭제 (null로 업데이트)
    const { error } = await supabase
      .from('reviews')
      .update({
        trainer_response: null,
        trainer_response_at: null,
      })
      .eq('id', reviewId)
      .eq('trainer_id', trainer.id)

    if (error) {
      console.error('Review response deletion error:', error)
      return NextResponse.json({ error: '답글 삭제에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/reviews/[id]/response error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
