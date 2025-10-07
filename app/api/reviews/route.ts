import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST - 리뷰 작성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    console.log('[POST /api/reviews] User:', user?.id)

    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다' }, { status: 401 })
    }

    const { bookingId, trainerId, rating, comment } = await request.json()
    console.log('[POST /api/reviews] Request data:', { bookingId, trainerId, rating, comment })

    // 고객 정보 확인
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    console.log('[POST /api/reviews] Customer:', customer, 'Error:', customerError)

    if (!customer) {
      return NextResponse.json({ error: '고객 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    // 예약 정보 확인 (완료된 예약인지)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, status, customer_id, trainer_id, service_completed_at')
      .eq('id', bookingId)
      .eq('customer_id', customer.id)
      .single()

    console.log('[POST /api/reviews] Booking:', booking, 'Error:', bookingError)

    if (!booking) {
      return NextResponse.json({ error: '예약 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    if (booking.status !== 'completed') {
      return NextResponse.json({ error: '완료된 예약에만 리뷰를 작성할 수 있습니다' }, { status: 400 })
    }

    // service_completed_at이 없으면 자동으로 현재 시간으로 채우기
    if (!booking.service_completed_at) {
      console.log('[POST /api/reviews] Auto-filling service_completed_at')
      await supabase
        .from('bookings')
        .update({ service_completed_at: new Date().toISOString() })
        .eq('id', bookingId)
    }

    // 이미 리뷰가 있는지 확인
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .single()

    console.log('[POST /api/reviews] Existing review:', existingReview)

    if (existingReview) {
      return NextResponse.json({ error: '이미 리뷰를 작성한 예약입니다' }, { status: 400 })
    }

    // 리뷰 생성
    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        booking_id: bookingId,
        customer_id: customer.id,
        trainer_id: trainerId,
        rating,
        comment: comment || null,
      })
      .select()
      .single()

    console.log('[POST /api/reviews] Review created:', review, 'Error:', error)

    if (error) {
      console.error('Review creation error:', error)
      return NextResponse.json({ error: `리뷰 작성에 실패했습니다: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error('POST /api/reviews error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// PUT - 리뷰 수정
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다' }, { status: 401 })
    }

    const { reviewId, rating, comment } = await request.json()

    // 고객 정보 확인
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!customer) {
      return NextResponse.json({ error: '고객 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    // 리뷰 수정 (RLS에서 권한 체크)
    const { data: review, error } = await supabase
      .from('reviews')
      .update({
        rating,
        comment: comment || null,
      })
      .eq('id', reviewId)
      .eq('customer_id', customer.id)
      .select()
      .single()

    if (error) {
      console.error('Review update error:', error)
      return NextResponse.json({ error: '리뷰 수정에 실패했습니다' }, { status: 500 })
    }

    if (!review) {
      return NextResponse.json({ error: '리뷰를 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json({ review })
  } catch (error) {
    console.error('PUT /api/reviews error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// DELETE - 리뷰 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다' }, { status: 401 })
    }

    const { reviewId } = await request.json()

    // 고객 정보 확인
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!customer) {
      return NextResponse.json({ error: '고객 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    // 리뷰 삭제 (RLS에서 권한 체크)
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('customer_id', customer.id)

    if (error) {
      console.error('Review deletion error:', error)
      return NextResponse.json({ error: '리뷰 삭제에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/reviews error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
