import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
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
import { SortableTableHeader } from '@/components/sortable-table-header'

interface PageProps {
  searchParams: Promise<{
    page?: string
    status?: string
    type?: string
    sort?: string
    direction?: string
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

  // Service Role 클라이언트로 RLS 우회
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // 예약 목록 가져오기 (Service Role로 RLS 우회)
  const { data: rawBookings, error } = await serviceSupabase
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
      status,
      matching_status,
      total_price,
      created_at,
      updated_at,
      trainer_notes,
      session_summary,
      customer:customers!customer_id(
        id,
        profile:profiles!profile_id(
          full_name,
          email,
          phone
        )
      )
    `)
    .eq('trainer_id', trainerInfo.id)
    .not('status', 'in', '(pending_payment,expired)') // 결제 대기 및 만료 예약 제외
    .order('booking_date', { ascending: false })

  if (error) {
    console.error('Error fetching bookings:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
  }

  // 데이터 구조 확인용 로그
  if (rawBookings && rawBookings.length > 0) {
    const firstCustomerData = Array.isArray(rawBookings[0].customer) ? rawBookings[0].customer[0] : rawBookings[0].customer
    const firstProfileData = Array.isArray(firstCustomerData?.profile) ? firstCustomerData.profile[0] : firstCustomerData?.profile
    console.log('First booking with customer data:', {
      id: rawBookings[0].id,
      customer: rawBookings[0].customer,
      hasCustomer: !!rawBookings[0].customer,
      customerProfile: firstProfileData
    })
  }

  const bookings = rawBookings

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
    filteredBookings = filteredBookings.filter(b => {
      const customerData = Array.isArray(b.customer) ? b.customer[0] : b.customer
      const profileData = Array.isArray(customerData?.profile) ? customerData.profile[0] : customerData?.profile
      return (
        profileData?.full_name?.toLowerCase().includes(search) ||
        profileData?.email?.toLowerCase().includes(search) ||
        profileData?.phone?.toLowerCase().includes(search) ||
        b.id.toLowerCase().includes(search)
      )
    })
  }

  // 정렬 (기본값: 최근 활동 순)
  const sortBy = params.sort || 'updated_at'
  const sortDirection = params.direction || 'desc'

  filteredBookings.sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'booking_date':
        comparison = new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime()
        break
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
      case 'updated_at':
        // updated_at이 없으면 created_at 사용
        comparison = new Date(a.updated_at || a.created_at).getTime() - new Date(b.updated_at || b.created_at).getTime()
        break
      case 'status':
        comparison = a.status.localeCompare(b.status)
        break
      case 'customer_name':
        const customerA = Array.isArray(a.customer) ? a.customer[0] : a.customer
        const profileA = Array.isArray(customerA?.profile) ? customerA.profile[0] : customerA?.profile
        const nameA = profileA?.full_name || ''

        const customerB = Array.isArray(b.customer) ? b.customer[0] : b.customer
        const profileB = Array.isArray(customerB?.profile) ? customerB.profile[0] : customerB?.profile
        const nameB = profileB?.full_name || ''

        comparison = nameA.localeCompare(nameB, 'ko')
        break
      default:
        comparison = 0
    }

    // 정렬 방향 적용
    return sortDirection === 'asc' ? comparison : -comparison
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

  // KST 변환 헬퍼 함수
  const toKST = (date: Date) => {
    const utc = date.getTime() + date.getTimezoneOffset() * 60000
    return new Date(utc + 9 * 3600000)
  }

  // 날짜 포맷 함수 (KST 적용)
  const formatBookingDate = (dateString: string, time: string) => {
    // booking_date는 날짜만 (YYYY-MM-DD) 있으므로 KST 명시
    const date = new Date(dateString + 'T00:00:00+09:00')
    const year = String(date.getFullYear()).slice(2) // 2025 -> 25
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
    // 시간에서 초 제거 (14:30:00 -> 14:30)
    const timeWithoutSeconds = time.substring(0, 5)
    return `${year}.${month}.${day} (${weekday}) ${timeWithoutSeconds}`
  }

  const formatCreatedDate = (dateString: string) => {
    // created_at은 timestamp이므로 KST 변환 필요
    const date = toKST(new Date(dateString))
    const year = String(date.getFullYear()).slice(2)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}.${month}.${day} ${hours}:${minutes}`
  }

  const formatFullDate = (dateString: string, time: string) => {
    // booking_date는 날짜만이므로 KST 명시
    const date = new Date(dateString + 'T00:00:00+09:00')
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}.${month}.${day} ${time.substring(0, 5)}`
  }

  const formatDateOnly = (dateString: string) => {
    // created_at은 timestamp이므로 KST 변환 필요
    const date = toKST(new Date(dateString))
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}.${month}.${day} ${hours}:${minutes}`
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">내 예약 스케줄</h1>
          <p className="text-base text-muted-foreground mt-1">{profile?.full_name} 트레이너님의 예약 일정</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">오늘 예약</p>
                    <p className="text-2xl font-bold">{todayCount}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">승인 대기</p>
                    <p className="text-2xl font-bold">{pendingCount}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">예정된 예약</p>
                    <p className="text-2xl font-bold">{upcomingCount}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">이번달 완료</p>
                    <p className="text-2xl font-bold">{thisMonthCompleted}</p>
                  </div>
                </div>
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
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-lg md:text-xl">예약 목록 ({filteredBookings.length}건)</CardTitle>
                <TrainerBookingFilters />
              </div>
            </CardHeader>
            <CardContent>
              {/* 모바일: 카드 레이아웃 */}
              <div className="flex flex-col gap-4 md:hidden">
                {paginatedBookings.map((booking) => {
                  const statusBadge = getStatusBadge(booking.status)
                  const customerData = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer
                  const profileData = Array.isArray(customerData?.profile) ? customerData.profile[0] : customerData?.profile

                  return (
                    <div key={booking.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-stretch gap-3">
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                          {/* 고객 정보 */}
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-semibold">
                                {profileData?.full_name || '고객 정보 없음'}
                              </p>
                              <Badge variant={statusBadge.variant} className="shrink-0">
                                {statusBadge.label}
                              </Badge>
                              <Badge variant="outline" className="shrink-0">
                                {getTypeBadge(booking.booking_type)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {profileData?.phone || profileData?.email}
                            </p>
                          </div>

                          {/* 예약 정보 */}
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              <span>{formatBookingDate(booking.booking_date, booking.start_time)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-mono">{booking.id.slice(0, 8)}</span>
                              <span>•</span>
                              <span>{formatCreatedDate(booking.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        {/* 상세보기 버튼 */}
                        <Link href={`/trainer/bookings/${booking.id}`} className="shrink-0">
                          <Button variant="outline" className="h-full w-20 flex flex-col items-center justify-center gap-2">
                            <Eye className="h-6 w-6" />
                            <span className="text-xs font-medium">상세보기</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 데스크톱: 테이블 레이아웃 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-semibold">예약번호</th>
                      <th className="text-left p-3 font-semibold">타입</th>
                      <SortableTableHeader label="고객" sortKey="customer_name" />
                      <SortableTableHeader label="예약일시" sortKey="booking_date" />
                      <SortableTableHeader label="최근 활동" sortKey="updated_at" />
                      <SortableTableHeader label="상태" sortKey="status" />
                      <th className="text-left p-3 font-semibold">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBookings.map((booking) => {
                      const statusBadge = getStatusBadge(booking.status)
                      const customerData = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer
                      const profileData = Array.isArray(customerData?.profile) ? customerData.profile[0] : customerData?.profile

                      return (
                        <tr key={booking.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-mono text-sm">{booking.id.slice(0, 8)}</td>
                          <td className="p-3">
                            <Badge variant="outline">{getTypeBadge(booking.booking_type)}</Badge>
                          </td>
                          <td className="p-3">
                            <div className="text-sm font-medium">
                              {profileData?.full_name || '고객 정보 없음'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {profileData?.phone || profileData?.email}
                            </div>
                          </td>
                          <td className="p-3">
                            {formatFullDate(booking.booking_date, booking.start_time)}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {formatDateOnly(booking.updated_at || booking.created_at)}
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
