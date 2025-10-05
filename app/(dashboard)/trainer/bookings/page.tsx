import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { TrainerBookingCard } from '@/components/trainer-booking-card'

export default async function TrainerBookingsPage() {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 트레이너 권한 확인 및 정보 가져오기
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'trainer') {
    redirect('/')
  }

  // 트레이너 정보 가져오기
  const { data: trainerInfo } = await supabase
    .from('trainers')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  if (!trainerInfo) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          <Alert variant="destructive">
            <AlertDescription>트레이너 정보를 찾을 수 없습니다.</AlertDescription>
          </Alert>
        </div>
      </>
    )
  }

  // 예약 목록 가져오기 (고객 정보 포함)
  // docs/DATABASE_SCHEMA.md 참조: bookings.customer_id -> customers.id -> profiles
  const { data: rawBookings, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customers!bookings_customer_id_fkey(
        id,
        profiles!customers_profile_id_fkey(
          full_name,
          email,
          phone
        )
      )
    `)
    .eq('trainer_id', trainerInfo.id)
    .order('booking_date', { ascending: true })

  if (error) {
    console.error('Error fetching bookings:', error)
  }

  // 데이터 구조 변환: customers -> customer로 rename
  const bookings = rawBookings?.map((booking: any) => ({
    ...booking,
    customer: booking.customers
  }))

  // 통계 계산 (utils 사용 필요)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  const stats = {
    todayBookings: bookings?.filter(b => {
      if (b.status !== 'confirmed') return false
      const bookingDateTime = new Date(`${b.booking_date}T${b.start_time}`)
      return bookingDateTime >= todayStart && bookingDateTime < todayEnd
    }).length || 0,
    pending: bookings?.filter(b => b.status === 'pending').length || 0,
    upcoming: bookings?.filter(b => {
      if (b.status !== 'confirmed') return false
      const bookingDateTime = new Date(`${b.booking_date}T${b.start_time}`)
      return bookingDateTime > now
    }).length || 0,
    thisMonthCompleted: bookings?.filter(b => {
      const bookingDate = new Date(b.booking_date)
      return b.status === 'completed' &&
        bookingDate.getMonth() === now.getMonth() &&
        bookingDate.getFullYear() === now.getFullYear()
    }).length || 0,
  }

  // 상태별 분류
  const pendingBookings = bookings?.filter(b => b.status === 'pending') || []
  const todayBookings = bookings?.filter(b => {
    if (b.status !== 'confirmed') return false
    const bookingDateTime = new Date(`${b.booking_date}T${b.start_time}`)
    return bookingDateTime >= todayStart && bookingDateTime < todayEnd
  }) || []
  const upcomingBookings = bookings?.filter(b => {
    if (b.status !== 'confirmed') return false
    const bookingDateTime = new Date(`${b.booking_date}T${b.start_time}`)
    return bookingDateTime > todayEnd
  }) || []
  const cancelledBookings = bookings?.filter(b => b.status === 'cancelled' || b.status === 'no_show') || []

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/trainer/dashboard">트레이너</BreadcrumbLink>
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
          <h1 className="text-3xl font-bold tracking-tight">내 예약 스케줄</h1>
          <p className="text-muted-foreground mt-1">{profile?.full_name} 트레이너님의 예약 일정</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">오늘 예약</p>
                  <p className="text-2xl font-bold mt-2">{stats.todayBookings}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">승인 대기</p>
                  <p className="text-2xl font-bold mt-2">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">예정된 예약</p>
                  <p className="text-2xl font-bold mt-2">{stats.upcoming}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">이번달 완료</p>
                  <p className="text-2xl font-bold mt-2">{stats.thisMonthCompleted}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 승인 대기 */}
        {pendingBookings.length > 0 && (
          <Section
            title="승인 요청"
            subtitle={`${pendingBookings.length}건의 예약이 승인을 기다리고 있습니다`}
            icon={<Clock className="w-6 h-6 text-yellow-600" />}
          >
            {pendingBookings.map(booking => (
              <TrainerBookingCard
                key={booking.id}
                booking={booking}
                showActions
                actionType="approve"
              />
            ))}
          </Section>
        )}

        {/* 오늘 예약 */}
        {todayBookings.length > 0 && (
          <Section
            title="오늘의 스케줄"
            subtitle={`${todayBookings.length}건의 예약이 있습니다`}
            icon={<Calendar className="w-6 h-6 text-blue-600" />}
          >
            {todayBookings.map(booking => (
              <TrainerBookingCard
                key={booking.id}
                booking={booking}
                showActions
                actionType="complete"
              />
            ))}
          </Section>
        )}

        {/* 예정된 예약 */}
        {upcomingBookings.length > 0 && (
          <Section
            title="예정된 예약"
            subtitle={`다가오는 ${upcomingBookings.length}건의 예약`}
            icon={<CheckCircle className="w-6 h-6 text-green-600" />}
          >
            {upcomingBookings.slice(0, 10).map(booking => (
              <TrainerBookingCard key={booking.id} booking={booking} />
            ))}
            {upcomingBookings.length > 10 && (
              <div className="text-center py-4">
                <button className="text-blue-600 hover:text-blue-700 font-semibold">
                  더 보기 ({upcomingBookings.length - 10}개)
                </button>
              </div>
            )}
          </Section>
        )}

        {/* 취소/거절된 예약 */}
        {cancelledBookings.length > 0 && (
          <Section
            title="취소/거절된 예약"
            subtitle={`${cancelledBookings.length}건의 취소된 예약`}
            icon={<XCircle className="w-6 h-6 text-red-600" />}
          >
            {cancelledBookings.map(booking => (
              <TrainerBookingCard key={booking.id} booking={booking} />
            ))}
          </Section>
        )}

        {/* No Bookings */}
        {bookings?.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">예약이 없습니다</h3>
              <p className="text-muted-foreground">새로운 예약 요청이 들어오면 여기에 표시됩니다</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

function StatCard({
  title,
  count,
  icon,
  color
}: {
  title: string
  count: number
  icon: React.ReactNode
  color: 'blue' | 'yellow' | 'green' | 'purple'
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold">{count}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  subtitle,
  icon,
  children
}: {
  title: string
  subtitle?: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      {subtitle && <p className="text-gray-600 mb-4">{subtitle}</p>}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

