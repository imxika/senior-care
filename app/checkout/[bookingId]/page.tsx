import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PaymentProviderButton from './PaymentProviderButton'
import PaymentTimer from './PaymentTimer'
import CancelButton from './CancelButton'

interface CheckoutPageProps {
  params: Promise<{ bookingId: string }>
}

interface BookingAddress {
  address?: string;
  address_detail?: string;
  address_label?: string;
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

  // ⏰ 만료된 예약 자동 정리 (10분/24시간 경과 체크)
  try {
    const { data: cleanupResult } = await supabase.rpc('cleanup_expired_bookings')
    if (cleanupResult && cleanupResult[0]?.expired_count > 0) {
      console.log(`✅ [CLEANUP] ${cleanupResult[0].expired_count} bookings marked as expired`)
    }
  } catch (cleanupError) {
    console.error('❌ [CLEANUP] Failed to run cleanup:', cleanupError)
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
      session_type,
      duration_minutes,
      booking_date,
      start_time,
      end_time,
      total_price,
      status,
      created_at,
      address_id,
      customer_notes,
      trainer:trainers(
        id,
        center_name,
        center_address,
        center_phone,
        profiles!trainers_profile_id_fkey(
          full_name,
          email
        )
      ),
      booking_address:customer_addresses!address_id(
        address,
        address_detail,
        address_label
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
          <Link
            href="/customer/bookings"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            예약 목록으로 돌아가기
          </Link>
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
          <Link
            href="/customer/bookings"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            예약 목록 보기
          </Link>
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
  const trainerData = Array.isArray(booking.trainer) ? booking.trainer[0] : booking.trainer
  const trainerProfile = trainerData?.profiles ? (Array.isArray(trainerData.profiles) ? trainerData.profiles[0] : trainerData.profiles) : null
  const trainerName = trainerProfile?.full_name || (booking.booking_type === 'recommended' ? '매칭 대기 중' : '트레이너 정보 없음')
  const centerName = trainerData?.center_name || null
  const centerAddress = trainerData?.center_address || null
  const centerPhone = trainerData?.center_phone || null

  // Service type label based on booking type
  const getServiceTypeLabel = () => {
    if (booking.booking_type === 'recommended') {
      switch (booking.service_type) {
        case 'home_visit':
          return '방문 서비스'
        case 'center_visit':
          return '센터 방문'
        case 'online':
          return '온라인 세션'
        default:
          return booking.service_type
      }
    } else {
      // 지정 예약 - service_type이 home_visit/center_visit일 수도 있고 pt/group일 수도 있음
      switch (booking.service_type) {
        case 'home_visit':
          return '방문 서비스'
        case 'center_visit':
          return '센터 방문'
        case 'pt':
          return '개인 트레이닝'
        case 'group':
          return '그룹 트레이닝'
        default:
          return booking.service_type
      }
    }
  }
  const serviceTypeLabel = getServiceTypeLabel()

  // Session type label
  const getSessionTypeLabel = (sessionType: string | null) => {
    if (!sessionType) return ''
    switch (sessionType) {
      case '1:1':
        return '1:1 개인 세션'
      case '2:1':
        return '2:1 소그룹 (2명)'
      case '3:1':
        return '3:1 소그룹 (3명)'
      default:
        return sessionType
    }
  }
  const sessionTypeLabel = booking.session_type ? getSessionTypeLabel(booking.session_type) : null

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">💳 결제하기</h1>
          <p className="mt-2 text-gray-600">예약 정보를 확인하고 결제를 진행해주세요</p>
        </div>

        {/* Payment Timer - 결제 시간 제한 표시 */}
        {booking.status === 'pending_payment' && (
          <PaymentTimer
            bookingType={booking.booking_type}
            createdAt={booking.created_at}
            bookingId={booking.id}
          />
        )}

        {/* Booking Details Card */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
          <div className="bg-blue-600 text-white px-6 py-4">
            <h2 className="text-xl font-semibold">📋 예약 정보</h2>
          </div>
          <div className="p-6 space-y-4">
            {/* 예약 번호 */}
            <div className="pb-4 border-b">
              <p className="text-sm text-gray-500">예약 번호</p>
              <p className="text-sm font-mono text-gray-900">{booking.id}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">트레이너</p>
                <p className="text-lg font-semibold text-gray-900">{trainerName}</p>
                {booking.booking_type === 'recommended' && !trainerProfile && (
                  <p className="text-xs text-orange-600 mt-1">
                    💡 결제 후 적합한 트레이너를 매칭해드려요
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">서비스 유형</p>
                <p className="text-lg font-semibold text-gray-900">{serviceTypeLabel}</p>
              </div>
              {sessionTypeLabel && (
                <div>
                  <p className="text-sm text-gray-500">세션 유형</p>
                  <p className="text-lg font-semibold text-gray-900">{sessionTypeLabel}</p>
                </div>
              )}
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
              {booking.duration_minutes && (
                <div>
                  <p className="text-sm text-gray-500">소요 시간</p>
                  <p className="text-lg font-semibold text-gray-900">{booking.duration_minutes}분</p>
                </div>
              )}
            </div>

            {/* 주소 (방문 서비스인 경우) */}
            {booking.service_type === 'home_visit' && booking.booking_address && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">방문 주소</p>
                {(booking.booking_address as BookingAddress)?.address_label && (
                  <span className="inline-block text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mb-2">
                    {(booking.booking_address as BookingAddress).address_label}
                  </span>
                )}
                <p className="text-gray-900">
                  {(booking.booking_address as BookingAddress)?.address}
                  {(booking.booking_address as BookingAddress)?.address_detail &&
                    ` ${(booking.booking_address as BookingAddress).address_detail}`}
                </p>
              </div>
            )}

            {/* 센터 정보 (센터 방문인 경우) */}
            {booking.service_type === 'center_visit' && centerName && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">방문할 센터</p>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-gray-900">{centerName}</p>
                  {centerAddress && (
                    <p className="text-gray-700">{centerAddress}</p>
                  )}
                  {centerPhone && (
                    <p className="text-gray-700">📞 {centerPhone}</p>
                  )}
                </div>
              </div>
            )}

            {/* 요청사항 */}
            {booking.customer_notes && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">요청사항</p>
                <p className="text-gray-700 whitespace-pre-wrap">{booking.customer_notes}</p>
              </div>
            )}

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

            {/* Cancel Button */}
            <div className="mt-6 text-center">
              <CancelButton bookingId={booking.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
