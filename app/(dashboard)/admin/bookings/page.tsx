import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import Link from 'next/link'
import { BOOKING_STATUS_CONFIG } from '@/lib/constants'
import { BookingFilters } from './booking-filters'
import { Eye } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{
    status?: string
    type?: string
    search?: string
    sort?: string
    page?: string
  }>
}

const ITEMS_PER_PAGE = 10

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  // 인증 및 권한 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'admin') {
    redirect('/')
  }

  // 모든 예약 목록 가져오기
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:customers!bookings_customer_id_fkey(
        id,
        profiles!customers_profile_id_fkey(
          full_name,
          email,
          phone
        )
      ),
      trainer:trainers(
        id,
        hourly_rate,
        specialties,
        profiles!trainers_profile_id_fkey(
          full_name,
          email
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching bookings:', error)
  }

  // 필터링
  let filteredBookings = bookings || []

  // 상태 필터
  if (params.status && params.status !== 'all') {
    filteredBookings = filteredBookings.filter(b => b.status === params.status)
  }

  // 예약 타입 필터
  if (params.type && params.type !== 'all') {
    filteredBookings = filteredBookings.filter(b => b.booking_type === params.type)
  }

  // 검색 필터
  if (params.search) {
    const searchLower = params.search.toLowerCase()
    filteredBookings = filteredBookings.filter(b => {
      const customerName = b.customer?.profiles?.full_name?.toLowerCase() || ''
      const customerEmail = b.customer?.profiles?.email?.toLowerCase() || ''
      const trainerName = b.trainer?.profiles?.full_name?.toLowerCase() || ''
      const bookingId = b.id.toLowerCase()

      return customerName.includes(searchLower) ||
             customerEmail.includes(searchLower) ||
             trainerName.includes(searchLower) ||
             bookingId.includes(searchLower)
    })
  }

  // 정렬
  const sortBy = params.sort || 'created_at'
  filteredBookings.sort((a, b) => {
    switch (sortBy) {
      case 'booking_date':
        return new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()
      case 'created_at':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'customer_name':
        const nameA = a.customer?.profiles?.full_name || ''
        const nameB = b.customer?.profiles?.full_name || ''
        return nameA.localeCompare(nameB)
      case 'status':
        return a.status.localeCompare(b.status)
      default:
        return 0
    }
  })

  // 승인대기 항목을 최상단으로
  filteredBookings.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return 0
  })

  // 통계 계산
  const stats = {
    total: bookings?.length || 0,
    pending: bookings?.filter(b => b.status === 'pending').length || 0,
    confirmed: bookings?.filter(b => b.status === 'confirmed').length || 0,
    completed: bookings?.filter(b => b.status === 'completed').length || 0,
    cancelled: bookings?.filter(b => b.status === 'cancelled').length || 0,
    todayBookings: bookings?.filter(b => {
      const today = new Date()
      const bookingDate = new Date(b.booking_date)
      return bookingDate.toDateString() === today.toDateString()
    }).length || 0,
  }

  // 페이지네이션
  const currentPage = parseInt(params.page || '1')
  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex)

  return (
    <>
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/admin/dashboard">관리자</BreadcrumbLink>
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
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">예약 관리</h1>
            <p className="text-muted-foreground mt-1">
              전체 예약 현황 및 관리 {filteredBookings.length !== bookings?.length && `(${filteredBookings.length}/${bookings?.length})`}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <StatCard title="전체 예약" count={stats.total} />
          <StatCard title="오늘 예약" count={stats.todayBookings} />
          <StatCard title="승인 대기" count={stats.pending} variant="yellow" />
          <StatCard title="확정" count={stats.confirmed} variant="blue" />
          <StatCard title="완료" count={stats.completed} variant="green" />
          <StatCard title="취소" count={stats.cancelled} variant="red" />
        </div>

        {/* Bookings Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>예약 목록 ({filteredBookings.length}건)</CardTitle>
              <BookingFilters />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium">예약번호</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">타입</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">고객</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">트레이너</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">예약일시</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">생성일</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">상태</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedBookings.map(booking => (
                    <BookingTableRow key={booking.id} booking={booking} />
                  ))}
                  {paginatedBookings.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        예약이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {startIndex + 1}-{Math.min(endIndex, filteredBookings.length)} / {filteredBookings.length}건
                </p>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Link
                      key={page}
                      href={`/admin/bookings?page=${page}&status=${params.status || ''}&type=${params.type || ''}&search=${params.search || ''}&sort=${params.sort || ''}`}
                    >
                      <Button
                        variant={page === currentPage ? 'default' : 'outline'}
                        size="sm"
                      >
                        {page}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function StatCard({ title, count, variant }: { title: string; count: number; variant?: string }) {
  const colorClass = variant === 'yellow' ? 'text-yellow-600' :
                     variant === 'blue' ? 'text-blue-600' :
                     variant === 'green' ? 'text-green-600' :
                     variant === 'red' ? 'text-red-600' : ''

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm font-medium text-muted-foreground">{title}</div>
        <div className={`text-2xl font-bold mt-2 ${colorClass}`}>{count}</div>
      </CardContent>
    </Card>
  )
}

function BookingTableRow({ booking }: { booking: any }) {
  const statusConfig = BOOKING_STATUS_CONFIG[booking.status as keyof typeof BOOKING_STATUS_CONFIG] || BOOKING_STATUS_CONFIG.pending
  const isPending = booking.status === 'pending'
  const isRecommendedUnmatched = booking.booking_type === 'recommended' && !booking.trainer_id

  // 예약일시
  const bookingDate = new Date(booking.booking_date)
  const [hours, minutes] = booking.start_time.split(':')
  bookingDate.setHours(parseInt(hours), parseInt(minutes))

  // 생성일
  const createdDate = new Date(booking.created_at)

  return (
    <tr className={`hover:bg-muted/50 ${isPending ? 'bg-yellow-50' : ''}`}>
      <td className="px-4 py-3 text-sm font-mono">#{booking.id.slice(0, 8)}</td>
      <td className="px-4 py-3">
        {booking.booking_type === 'recommended' ? (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            추천
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            지정
          </Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium">
          {booking.customer?.profiles?.full_name || '정보 없음'}
        </div>
        <div className="text-xs text-muted-foreground">{booking.customer?.profiles?.email}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">
          {booking.trainer?.profiles?.full_name || (
            <span className="text-muted-foreground">
              {isRecommendedUnmatched ? '매칭 대기' : '-'}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm">
        {bookingDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} {bookingDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {createdDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
      </td>
      <td className="px-4 py-3">
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {isRecommendedUnmatched && (
            <Link href={`/admin/bookings/recommended/${booking.id}/match`}>
              <Button variant="default" size="sm">
                매칭
              </Button>
            </Link>
          )}
          <Link href={`/admin/bookings/${booking.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              상세보기
            </Button>
          </Link>
        </div>
      </td>
    </tr>
  )
}
