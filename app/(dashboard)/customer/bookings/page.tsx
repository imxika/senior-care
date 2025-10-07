import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { SuccessMessage } from '@/components/success-message'
import { CustomerBookingFilters } from './customer-booking-filters'
import { BookingDateDisplay } from '@/components/booking-date-display'

interface PageProps {
  searchParams: Promise<{
    success?: string
    page?: string
    status?: string
    type?: string
    sort?: string
    search?: string
  }>
}

export default async function CustomerBookingsPage({ searchParams }: PageProps) {
  const params = await searchParams
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

  // 고객 ID 조회
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!customer) {
    redirect('/customer/dashboard')
  }

  // 예약 목록 가져오기 (트레이너 정보 포함)
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_type,
      trainer:trainers(
        id,
        profiles!trainers_profile_id_fkey(
          full_name,
          email,
          avatar_url
        )
      )
    `)
    .eq('customer_id', customer.id)
    .order('booking_date', { ascending: false })

  if (error) {
    console.error('Error fetching bookings:', error)
  }

  // 통계 계산
  const upcomingCount = bookings?.filter(b =>
    b.status === 'confirmed' && new Date(b.booking_date) > new Date()
  ).length || 0

  const pendingCount = bookings?.filter(b => b.status === 'pending').length || 0
  const completedCount = bookings?.filter(b => b.status === 'completed').length || 0
  const cancelledCount = bookings?.filter(b => b.status === 'cancelled').length || 0

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
      b.trainer?.profiles?.full_name?.toLowerCase().includes(search) ||
      b.trainer?.profiles?.email?.toLowerCase().includes(search) ||
      b.id.toLowerCase().includes(search)
    )
  }

  // 정렬 - 예약일시 기준 오름차순 (가까운 예약이 먼저)
  const sortBy = params.sort || 'booking_date'
  filteredBookings.sort((a, b) => {
    const now = new Date()
    switch (sortBy) {
      case 'booking_date':
        // 예약일시 기준: 미래 예약은 가까운 순, 과거 예약은 최근 순
        const aDate = new Date(a.booking_date)
        const bDate = new Date(b.booking_date)
        const aIsFuture = aDate >= now
        const bIsFuture = bDate >= now

        if (aIsFuture && bIsFuture) {
          // 둘 다 미래: 가까운 순
          return aDate.getTime() - bDate.getTime()
        } else if (!aIsFuture && !bIsFuture) {
          // 둘 다 과거: 최근 순
          return bDate.getTime() - aDate.getTime()
        } else {
          // 미래 예약이 먼저
          return aIsFuture ? -1 : 1
        }
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
    }
    return variants[status as keyof typeof variants] || { label: status, variant: 'outline' as const }
  }

  // 타입 표시 함수
  const getTypeBadge = (type: string) => {
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">내 예약 관리</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">{profile?.full_name}님의 예약 현황</p>
        </div>

        {/* Success Message */}
        {params.success === 'true' && (
          <SuccessMessage
            message="예약이 성공적으로 요청되었습니다!"
            description="트레이너가 예약을 확인하면 알림을 받게 됩니다."
          />
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <Calendar className="h-5 w-5 text-blue-600" />
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">대기중</p>
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
                    <p className="text-sm font-medium text-muted-foreground">완료</p>
                    <p className="text-2xl font-bold">{completedCount}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">취소됨</p>
                    <p className="text-2xl font-bold">{cancelledCount}</p>
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
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-lg md:text-xl">예약 목록 ({filteredBookings.length}건)</CardTitle>
                <CustomerBookingFilters />
              </div>
            </CardHeader>
            <CardContent>
              {/* 모바일: 카드 레이아웃 */}
              <div className="flex flex-col gap-4 md:hidden">
                {paginatedBookings.map((booking) => {
                  const statusBadge = getStatusBadge(booking.status)
                  return (
                    <div key={booking.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-stretch gap-3">
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                          {/* 트레이너 정보 */}
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-semibold">
                                {booking.trainer?.profiles?.full_name || (
                                  <span className="text-muted-foreground">매칭 대기중</span>
                                )}
                              </p>
                              <Badge variant={statusBadge.variant} className="shrink-0">
                                {statusBadge.label}
                              </Badge>
                              <Badge variant="outline" className="shrink-0">
                                {getTypeBadge(booking.booking_type)}
                              </Badge>
                            </div>
                          </div>

                          {/* 예약 정보 */}
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              <BookingDateDisplay date={booking.booking_date} format="booking" />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-mono">{booking.id.slice(0, 8)}</span>
                              <span>•</span>
                              <BookingDateDisplay date={booking.created_at} format="created" />
                            </div>
                          </div>
                        </div>

                        {/* 상세보기 버튼 */}
                        <Link href={`/customer/bookings/${booking.id}`} className="shrink-0">
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
                      <th className="text-left p-3 font-semibold">트레이너</th>
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
                            {booking.trainer?.profiles?.full_name || (
                              <span className="text-muted-foreground">매칭 대기중</span>
                            )}
                          </td>
                          <td className="p-3">
                            <BookingDateDisplay date={booking.booking_date} format="full" />
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            <BookingDateDisplay date={booking.created_at} format="date-only" />
                          </td>
                          <td className="p-3">
                            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                          </td>
                          <td className="p-3">
                            <Link href={`/customer/bookings/${booking.id}`}>
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
                  <Link href={`/customer/bookings?page=${Math.max(1, currentPage - 1)}&${new URLSearchParams(params as Record<string, string>).toString()}`}>
                    <Button variant="outline" size="sm" disabled={currentPage === 1}>
                      이전
                    </Button>
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    {currentPage} / {totalPages}
                  </span>
                  <Link href={`/customer/bookings?page=${Math.min(totalPages, currentPage + 1)}&${new URLSearchParams(params as Record<string, string>).toString()}`}>
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
