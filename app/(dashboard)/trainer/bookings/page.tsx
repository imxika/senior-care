import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { TrainerBookingFilters } from './trainer-booking-filters'

interface PageProps {
  searchParams: Promise<{
    page?: string
    status?: string
    type?: string
    sort?: string
    search?: string
  }>
}

export default async function TrainerBookingsPage({ searchParams }: PageProps) {
  const params = await searchParams
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
    .order('booking_date', { ascending: false })

  if (error) {
    console.error('Error fetching bookings:', error)
  }

  // 데이터 구조 변환: customers -> customer로 rename
  interface RawBooking {
    id: string
    status: string
    booking_date: string
    start_time: string
    created_at: string
    booking_type?: string
    customers?: {
      id: string
      profiles?: {
        full_name?: string
        email?: string
        phone?: string
      }
    }
    customer?: {
      id: string
      profiles?: {
        full_name?: string
        email?: string
        phone?: string
      }
    }
  }

  const bookings = rawBookings?.map((booking: RawBooking) => ({
    ...booking,
    customer: booking.customers
  }))

  // 통계 계산
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  const todayCount = bookings?.filter(b => {
    if (b.status !== 'confirmed') return false
    const bookingDateTime = new Date(`${b.booking_date}T${b.start_time}`)
    return bookingDateTime >= todayStart && bookingDateTime < todayEnd
  }).length || 0

  const pendingCount = bookings?.filter(b => b.status === 'pending').length || 0

  const upcomingCount = bookings?.filter(b => {
    if (b.status !== 'confirmed') return false
    const bookingDateTime = new Date(`${b.booking_date}T${b.start_time}`)
    return bookingDateTime > now
  }).length || 0

  const thisMonthCompleted = bookings?.filter(b => {
    const bookingDate = new Date(b.booking_date)
    return b.status === 'completed' &&
      bookingDate.getMonth() === now.getMonth() &&
      bookingDate.getFullYear() === now.getFullYear()
  }).length || 0

  // 필터링
  let filteredBookings = bookings || []

  if (params.status && params.status !== 'all') {
    filteredBookings = filteredBookings.filter(b => b.status === params.status)
  }

  if (params.type && params.type !== 'all') {
    filteredBookings = filteredBookings.filter(b => b.booking_type === params.type)
  }

  if (params.search) {
    const search = params.search.toLowerCase()
    filteredBookings = filteredBookings.filter(b =>
      b.customer?.profiles?.full_name?.toLowerCase().includes(search) ||
      b.customer?.profiles?.email?.toLowerCase().includes(search) ||
      b.customer?.profiles?.phone?.toLowerCase().includes(search) ||
      b.id.toLowerCase().includes(search)
    )
  }

  // 정렬
  const sortBy = params.sort || 'booking_date'
  filteredBookings.sort((a, b) => {
    switch (sortBy) {
      case 'booking_date':
        return new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()
      case 'created_at':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'status':
        return a.status.localeCompare(b.status)
      default:
        return 0
    }
  })

  // 페이지네이션
  const ITEMS_PER_PAGE = 10
  const currentPage = parseInt(params.page || '1')
  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex)

  // 상태 표시 함수
  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { label: '대기중', variant: 'secondary' as const },
      confirmed: { label: '확정', variant: 'default' as const },
      completed: { label: '완료', variant: 'outline' as const },
      cancelled: { label: '취소', variant: 'destructive' as const },
      no_show: { label: '노쇼', variant: 'destructive' as const },
    }
    return variants[status as keyof typeof variants] || { label: status, variant: 'outline' as const }
  }

  // 타입 표시 함수
  const getTypeBadge = (type: string | undefined) => {
    return type === 'direct' ? '지정' : '추천'
  }

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
                  <p className="text-2xl font-bold mt-2">{todayCount}</p>
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
                  <p className="text-2xl font-bold mt-2">{pendingCount}</p>
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
                  <p className="text-2xl font-bold mt-2">{upcomingCount}</p>
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
                  <p className="text-2xl font-bold mt-2">{thisMonthCompleted}</p>
                </div>
                <XCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 예약 목록 */}
        {bookings?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                예약이 없습니다
              </h3>
              <p className="text-muted-foreground">
                새로운 예약 요청이 들어오면 여기에 표시됩니다
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle>예약 목록 ({filteredBookings.length}건)</CardTitle>
                <TrainerBookingFilters />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-semibold">예약번호</th>
                      <th className="text-left p-3 font-semibold">타입</th>
                      <th className="text-left p-3 font-semibold">고객</th>
                      <th className="text-left p-3 font-semibold">예약일시</th>
                      <th className="text-left p-3 font-semibold">생성일</th>
                      <th className="text-left p-3 font-semibold">상태</th>
                      <th className="text-left p-3 font-semibold">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBookings.map((booking) => {
                      const statusBadge = getStatusBadge(booking.status)
                      return (
                        <tr key={booking.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-mono text-sm">{booking.id.slice(0, 8)}</td>
                          <td className="p-3">
                            <Badge variant="outline">{getTypeBadge(booking.booking_type)}</Badge>
                          </td>
                          <td className="p-3">
                            <div className="text-sm font-medium">
                              {booking.customer?.profiles?.full_name || '고객 정보 없음'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {booking.customer?.profiles?.phone || booking.customer?.profiles?.email}
                            </div>
                          </td>
                          <td className="p-3">
                            {new Date(booking.booking_date).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })} {booking.start_time}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {new Date(booking.created_at).toLocaleDateString('ko-KR')}
                          </td>
                          <td className="p-3">
                            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                          </td>
                          <td className="p-3">
                            <Link href={`/trainer/bookings/${booking.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                상세보기
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Link href={`/trainer/bookings?page=${Math.max(1, currentPage - 1)}&${new URLSearchParams(params as Record<string, string>).toString()}`}>
                    <Button variant="outline" size="sm" disabled={currentPage === 1}>
                      이전
                    </Button>
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    {currentPage} / {totalPages}
                  </span>
                  <Link href={`/trainer/bookings?page=${Math.min(totalPages, currentPage + 1)}&${new URLSearchParams(params as Record<string, string>).toString()}`}>
                    <Button variant="outline" size="sm" disabled={currentPage === totalPages}>
                      다음
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
