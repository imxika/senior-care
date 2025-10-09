import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { CustomerBookingDetail } from '@/components/customer-booking-detail'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CustomerBookingDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 고객 정보 확인
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!customer) {
    redirect('/')
  }

  // 예약 정보 조회 (결제 정보 포함)
  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_type,
      trainer_matched_at,
      trainer_confirmed_at,
      service_started_at,
      service_completed_at,
      trainer:trainers(
        id,
        hourly_rate,
        profiles!trainers_profile_id_fkey(
          full_name,
          phone,
          email
        )
      ),
      booking_address:customer_addresses(
        id,
        address,
        address_detail,
        address_label
      ),
      payments(
        id,
        amount,
        currency,
        payment_method,
        payment_status,
        payment_provider,
        paid_at,
        created_at,
        payment_metadata
      )
    `)
    .eq('id', id)
    .eq('customer_id', customer.id)
    .single()

  if (error || !booking) {
    notFound()
  }

  // 리뷰 정보 조회 (트레이너 이름 포함)
  const { data: review } = await supabase
    .from('reviews')
    .select(`
      *,
      trainer:trainers(
        id,
        profiles!trainers_profile_id_fkey(
          full_name
        )
      )
    `)
    .eq('booking_id', id)
    .single()

  return <CustomerBookingDetail booking={booking} existingReview={review} />
}
