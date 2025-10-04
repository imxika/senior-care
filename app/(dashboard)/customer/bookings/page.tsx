import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { CustomerBookingCard } from '@/components/customer-booking-card'

export default async function CustomerBookingsPage() {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 고객 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'customer') {
    redirect('/')
  }

  // 예약 목록 가져오기 (트레이너 정보 포함)
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      *,
      trainer:trainers(
        id,
        profiles!trainers_profile_id_fkey(
          full_name,
          avatar_url
        )
      )
    `)
    .eq('customer_id', user.id)
    .order('scheduled_at', { ascending: false })

  if (error) {
    console.error('Error fetching bookings:', error)
  }

  // 상태별로 예약 분류
  const upcomingBookings = bookings?.filter(b =>
    b.status === 'confirmed' && new Date(b.scheduled_at) > new Date()
  ) || []

  const completedBookings = bookings?.filter(b =>
    b.status === 'completed'
  ) || []

  const cancelledBookings = bookings?.filter(b =>
    b.status === 'cancelled'
  ) || []

  const pendingBookings = bookings?.filter(b =>
    b.status === 'pending'
  ) || []

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/customer/dashboard">고객</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>예약 관리</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">내 예약 관리</h1>
          <p className="text-muted-foreground mt-1">{profile?.full_name}님의 예약 현황입니다</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">예정된 예약</p>
                  <p className="text-2xl font-bold mt-2">{upcomingBookings.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">대기중</p>
                  <p className="text-2xl font-bold mt-2">{pendingBookings.length}</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">완료</p>
                  <p className="text-2xl font-bold mt-2">{completedBookings.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">취소됨</p>
                  <p className="text-2xl font-bold mt-2">{cancelledBookings.length}</p>
                </div>
                <XCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 예약 목록 */}
        <div className="space-y-8">
          {/* 예정된 예약 */}
          {upcomingBookings.length > 0 && (
            <Section title="예정된 예약" icon={<Calendar className="w-6 h-6 text-blue-600" />}>
              {upcomingBookings.map(booking => (
                <CustomerBookingCard key={booking.id} booking={booking} />
              ))}
            </Section>
          )}

          {/* 대기중 예약 */}
          {pendingBookings.length > 0 && (
            <Section title="승인 대기중" icon={<Clock className="w-6 h-6 text-yellow-600" />}>
              {pendingBookings.map(booking => (
                <CustomerBookingCard key={booking.id} booking={booking} />
              ))}
            </Section>
          )}

          {/* 완료된 예약 */}
          {completedBookings.length > 0 && (
            <Section title="완료된 예약" icon={<CheckCircle className="w-6 h-6 text-green-600" />}>
              {completedBookings.map(booking => (
                <CustomerBookingCard key={booking.id} booking={booking} />
              ))}
            </Section>
          )}

          {/* 취소된 예약 */}
          {cancelledBookings.length > 0 && (
            <Section title="취소된 예약" icon={<XCircle className="w-6 h-6 text-red-600" />}>
              {cancelledBookings.map(booking => (
                <CustomerBookingCard key={booking.id} booking={booking} />
              ))}
            </Section>
          )}

          {/* 예약 없음 */}
          {bookings?.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  예약 내역이 없습니다
                </h3>
                <p className="text-muted-foreground mb-6">
                  전문 트레이너와 함께 건강한 변화를 시작해보세요
                </p>
                <Link
                  href="/trainers"
                  className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  트레이너 둘러보기
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

function Section({
  title,
  icon,
  children
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {icon}
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}
