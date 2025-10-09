import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PaymentProviderButton from './PaymentProviderButton'

interface CheckoutPageProps {
  params: Promise<{ bookingId: string }>
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { bookingId } = await params
  const supabase = await createClient()

  // 1. Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/signin?redirect=/checkout/' + bookingId)
  }

  // 2. Get customer record
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (customerError || !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">❌ 오류</h1>
          <p className="text-gray-700">고객 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    )
  }

  // 3. Get booking details with trainer info
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id,
      customer_id,
      trainer_id,
      booking_type,
      service_type,
      booking_date,
      start_time,
      end_time,
      total_price,
      status,
      created_at,
      trainer:trainers(
        id,
        profiles!trainers_profile_id_fkey(
          full_name,
          email
        )
      )
    `)
    .eq('id', bookingId)
    .eq('customer_id', customer.id)
    .single()

  if (bookingError || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">❌ 예약을 찾을 수 없습니다</h1>
          <p className="text-gray-700 mb-4">
            예약 정보를 불러올 수 없습니다. 예약 ID를 확인해주세요.
          </p>
          <a
            href="/customer/bookings"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            예약 목록으로 돌아가기
          </a>
        </div>
      </div>
    )
  }

  // 4. Check if payment already exists
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, payment_status, payment_provider')
    .eq('booking_id', bookingId)
    .single()

  if (existingPayment && existingPayment.payment_status === 'paid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-2xl font-bold text-green-600 mb-4">✅ 결제 완료</h1>
          <p className="text-gray-700 mb-4">
            이미 결제가 완료된 예약입니다.
          </p>
          <a
            href="/customer/bookings"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            예약 목록 보기
          </a>
        </div>
      </div>
    )
  }

  // Format date and time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const weekday = weekdays[date.getDay()]
    return `${year}년 ${month}월 ${day}일 (${weekday})`
  }

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5) // "14:00:00" -> "14:00"
  }

  // Trainer profile access (trainers → profiles array)
  const trainerProfile = Array.isArray(booking.trainer) ? booking.trainer[0]?.profiles?.[0] : null
  const trainerName = trainerProfile ? trainerProfile.full_name : '트레이너'
  const serviceTypeLabel = booking.service_type === 'pt' ? '개인 트레이닝' : '그룹 트레이닝'

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">💳 결제하기</h1>
          <p className="mt-2 text-gray-600">예약 정보를 확인하고 결제를 진행해주세요</p>
        </div>

        {/* Booking Details Card */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
          <div className="bg-blue-600 text-white px-6 py-4">
            <h2 className="text-xl font-semibold">📋 예약 정보</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">트레이너</p>
                <p className="text-lg font-semibold text-gray-900">{trainerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">서비스 유형</p>
                <p className="text-lg font-semibold text-gray-900">{serviceTypeLabel}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">예약 날짜</p>
                <p className="text-lg font-semibold text-gray-900">{formatDate(booking.booking_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">시간</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                </p>
              </div>
            </div>
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-900">총 결제 금액</span>
                <span className="text-2xl font-bold text-blue-600">
                  {booking.total_price.toLocaleString('ko-KR')}원
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Provider Selection */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">결제 수단 선택</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Toss Payments */}
              <PaymentProviderButton
                provider="toss"
                bookingId={booking.id}
                amount={booking.total_price}
                label="💳 Toss Payments"
                description="국내 간편 결제"
              />

              {/* Stripe */}
              <PaymentProviderButton
                provider="stripe"
                bookingId={booking.id}
                amount={booking.total_price}
                label="💵 Stripe"
                description="글로벌 결제 (개발/테스트)"
              />
            </div>

            {/* Info Notice */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                ℹ️ <strong>안내:</strong> 결제는 안전하게 처리됩니다. 결제 정보는 암호화되어 저장되지 않습니다.
              </p>
            </div>

            {/* Cancel Link */}
            <div className="mt-6 text-center">
              <a
                href="/customer/bookings"
                className="text-gray-600 hover:text-gray-900 underline"
              >
                취소하고 예약 목록으로 돌아가기
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
