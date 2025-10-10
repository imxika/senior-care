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
import { SortableTableHeader } from '@/components/sortable-table-header'

// 타입 정의
interface TrainerProfile {
  full_name: string
  avatar_url?: string | null
}

interface Trainer {
  id: string
  profiles: TrainerProfile | TrainerProfile[]
}

interface Payment {
  id: string
  payment_status: string
  created_at: string
  amount?: number
}

interface PageProps {
  searchParams: Promise<{
    success?: string
    page?: string
    status?: string
    type?: string
    sort?: string
    direction?: string
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
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  // Customer 레코드가 없으면 대시보드로 (프로필 설정 필요)
  if (!customer) {
    console.log('No customer record found, redirecting to dashboard')
    redirect('/customer/dashboard')
  }

  // ⏰ 만료된 예약 자동 정리 (10분/24시간 경과 체크)
  try {
    const { data: cleanupResult } = await supabase.rpc('cleanup_expired_bookings')
    if (cleanupResult && cleanupResult[0]?.expired_count > 0) {
      console.log(`✅ [CLEANUP] ${cleanupResult[0].expired_count} bookings marked as expired`)
    }
  } catch (cleanupError) {
    console.error('❌ [CLEANUP] Failed to run cleanup:', cleanupError)
    // Cleanup 실패해도 페이지는 계속 로드
  }

  // 예약 목록 가져오기 (트레이너 정보 + 결제 정보 포함)
  // Note: expired 예약은 기본적으로 제외 (별도 탭에서 확인 가능)
  const { data: bookings, error } = await supabase
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
      trainer:trainers(
        id,
        profiles!trainers_profile_id_fkey(
          full_name,
          email,
          avatar_url
        )
      ),
      payments(
        id,
        amount,
        currency,
        payment_method,
        payment_status,
        payment_provider,
        paid_at,
        created_at
      )
    `)
    .eq('customer_id', customer.id)
    .neq('status', 'expired')  // 만료된 예약 제외
    .order('booking_date', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching bookings:', error)
  }

  const bookingsList = bookings || []
  const now = Date.now()

  // 통계 계산
  const upcomingCount = bookingsList.filter(b => {
    if (b.status !== 'confirmed') return false
    const bookingTime = new Date(b.booking_date).getTime()
    return bookingTime > now
  }).length

  const pendingCount = bookingsList.filter(b => b.status === 'pending').length
  const completedCount = bookingsList.filter(b => b.status === 'completed').length
  const cancelledCount = bookingsList.filter(b => b.status === 'cancelled').length

  // 필터링
  let filteredBookings = bookings || []

  if (params.status && params.status !== 'all') {
    if (params.status === 'upcoming') {
      // "예정된 예약": confirmed 상태 + 미래 날짜
      filteredBookings = filteredBookings.filter(b => {
        if (b.status !== 'confirmed') return false
        const bookingTime = new Date(b.booking_date).getTime()
        return bookingTime > now
      })
    } else {
      // 일반 상태 필터
      filteredBookings = filteredBookings.filter(b => b.status === params.status)
    }
  }

  if (params.type && params.type !== 'all') {
    filteredBookings = filteredBookings.filter(b => b.booking_type === params.type)
  }

  if (params.search) {
    const search = params.search.toLowerCase()
    filteredBookings = filteredBookings.filter(b => {
      const trainerProfile = Array.isArray(b.trainer) ? b.trainer[0]?.profiles?.[0] : null
      return (
        trainerProfile?.full_name?.toLowerCase().includes(search) ||
        trainerProfile?.email?.toLowerCase().includes(search) ||
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
        const aDate = new Date(a.booking_date).getTime()
        const bDate = new Date(b.booking_date).getTime()
        comparison = aDate - bDate
        break
      case 'created_at':
        const aCreated = new Date(a.created_at).getTime()
        const bCreated = new Date(b.created_at).getTime()
        comparison = aCreated - bCreated
        break
      case 'updated_at':
        // updated_at이 없으면 created_at 사용
        const aUpdated = new Date(a.updated_at || a.created_at).getTime()
        const bUpdated = new Date(b.updated_at || b.created_at).getTime()
        comparison = aUpdated - bUpdated
        break
      case 'status':
        comparison = a.status.localeCompare(b.status)
        break
      case 'trainer_name':
        const aTrainerProfile = Array.isArray(a.trainer) ? a.trainer[0]?.profiles?.[0] : null
        const bTrainerProfile = Array.isArray(b.trainer) ? b.trainer[0]?.profiles?.[0] : null
        const aTrainer = aTrainerProfile?.full_name || ''
        const bTrainer = bTrainerProfile?.full_name || ''
        comparison = aTrainer.localeCompare(bTrainer)
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
    }
    return variants[status as keyof typeof variants] || { label: status, variant: 'outline' as const }
  }

  // 타입 표시 함수
  const getTypeBadge = (type: string) => {
    return type === 'direct' ? '지정' : '추천'
  }

  // Trainer profile helper
  const getTrainerProfile = (trainer: Trainer | Trainer[] | null) => {
    if (!trainer) return null
    // Handle both array and object formats
    if (Array.isArray(trainer)) {
      const trainerObj = trainer[0]
      return Array.isArray(trainerObj?.profiles) ? trainerObj.profiles[0] : trainerObj?.profiles
    }
    // Direct object access
    return Array.isArray(trainer.profiles) ? trainer.profiles[0] : trainer.profiles
  }

  // Payment helper (가장 최근 결제 반환)
  const getPayment = (payments: Payment[] | null) => {
    if (!Array.isArray(payments) || payments.length === 0) return null

    // 가장 최근 결제 반환 (생성일 기준)
    return payments.sort((a: Payment, b: Payment) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]
  }

  // Payment status badge
  const getPaymentBadge = (payment: Payment | null) => {
    if (!payment) {
      return { label: '⏳ 결제 대기', variant: 'secondary' as const, color: 'text-yellow-600' }
    }

    const status = payment.payment_status
    const variants = {
      paid: { label: '✅ 결제 완료', variant: 'default' as const, color: 'text-green-600' },
      pending: { label: '⏳ 결제 대기', variant: 'secondary' as const, color: 'text-yellow-600' },
      failed: { label: '❌ 결제 실패', variant: 'destructive' as const, color: 'text-red-600' },
      cancelled: { label: '🚫 결제 취소', variant: 'outline' as const, color: 'text-gray-600' },
      refunded: { label: '💰 환불 완료', variant: 'outline' as const, color: 'text-blue-600' },
    }
    return variants[status as keyof typeof variants] || { label: '⏳ 결제 대기', variant: 'outline' as const, color: 'text-gray-600' }
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

      <div className="flex flex-1 flex-col gap-6 p-6 md:gap-8 md:p-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">내 예약 관리</h1>
          <p className="text-xl md:text-2xl text-muted-foreground">{profile?.full_name}님의 예약 현황</p>
        </div>

        {/* Success Message */}
        {params.success === 'true' && (
          <SuccessMessage
            message="예약이 성공적으로 요청되었습니다!"
            description="트레이너가 예약을 확인하면 알림을 받게 됩니다."
          />
        )}

        {/* Stats - 시니어 친화적 */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          <Card className="border-2">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900">
                  <Calendar className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-base md:text-lg font-medium text-muted-foreground">예정된 예약</p>
                  <p className="text-3xl md:text-4xl font-bold">{upcomingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-900">
                  <Clock className="h-7 w-7 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-base md:text-lg font-medium text-muted-foreground">대기중</p>
                  <p className="text-3xl md:text-4xl font-bold">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900">
                  <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-base md:text-lg font-medium text-muted-foreground">완료</p>
                  <p className="text-3xl md:text-4xl font-bold">{completedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900">
                  <XCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-base md:text-lg font-medium text-muted-foreground">취소됨</p>
                  <p className="text-3xl md:text-4xl font-bold">{cancelledCount}</p>
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
              {/* 모바일: 카드 레이아웃 - 시니어 친화적 */}
              <div className="flex flex-col gap-5 md:hidden">
                {paginatedBookings.map((booking) => {
                  const statusBadge = getStatusBadge(booking.status)
                  return (
                    <div key={booking.id} className="border-2 rounded-xl p-5 hover:shadow-lg transition-shadow bg-card">
                      <div className="space-y-4">
                        {/* 트레이너 정보 */}
                        <div>
                          <p className="text-xl font-semibold mb-2">
                            {getTrainerProfile(booking.trainer)?.full_name || (
                              <span className="text-muted-foreground">매칭 대기중</span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={statusBadge.variant} className="text-base px-3 py-1">
                              {statusBadge.label}
                            </Badge>
                            <Badge variant="outline" className="text-base px-3 py-1">
                              {getTypeBadge(booking.booking_type)}
                            </Badge>
                            {(() => {
                              const payment = getPayment(booking.payments)
                              const paymentBadge = getPaymentBadge(payment)
                              return (
                                <Badge variant={paymentBadge.variant} className="text-base px-3 py-1">
                                  {paymentBadge.label}
                                </Badge>
                              )
                            })()}
                          </div>
                        </div>

                        {/* 예약 정보 */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 text-base text-muted-foreground">
                            <Calendar className="h-5 w-5 shrink-0" />
                            <BookingDateDisplay date={booking.booking_date} format="date-only" />
                            <span className="font-semibold">{booking.start_time.slice(0, 5)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div className="text-muted-foreground">
                              <span className="font-mono">{booking.id.slice(0, 8)}</span>
                              <span className="mx-2">•</span>
                              <BookingDateDisplay date={booking.updated_at || booking.created_at} format="created" />
                            </div>
                            {booking.total_price && (
                              <span className="font-bold text-lg">
                                {booking.total_price.toLocaleString('ko-KR')}원
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 상세보기 버튼 */}
                        <Link href={`/customer/bookings/${booking.id}`} className="block">
                          <Button variant="outline" className="w-full h-14 text-lg border-2">
                            <Eye className="h-5 w-5 mr-2" />
                            상세보기
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 데스크톱: 테이블 레이아웃 - 시니어 친화적 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 bg-muted/50">
                      <th className="text-left p-4 font-semibold text-base">예약번호</th>
                      <th className="text-left p-4 font-semibold text-base">타입</th>
                      <SortableTableHeader label="트레이너" sortKey="trainer_name" className="p-4 text-base" basePath="/customer/bookings" />
                      <SortableTableHeader label="예약일시" sortKey="booking_date" className="p-4 text-base" basePath="/customer/bookings" />
                      <th className="text-left p-4 font-semibold text-base">결제</th>
                      <SortableTableHeader label="최근 활동" sortKey="updated_at" className="p-4 text-base" basePath="/customer/bookings" />
                      <SortableTableHeader label="상태" sortKey="status" className="p-4 text-base" basePath="/customer/bookings" />
                      <th className="text-left p-4 font-semibold text-base">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBookings.map((booking) => {
                      const statusBadge = getStatusBadge(booking.status)
                      return (
                        <tr key={booking.id} className="border-b hover:bg-muted/50">
                          <td className="p-4 font-mono text-base">{booking.id.slice(0, 8)}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-base px-3 py-1">{getTypeBadge(booking.booking_type)}</Badge>
                          </td>
                          <td className="p-4 text-base">
                            {getTrainerProfile(booking.trainer)?.full_name || (
                              <span className="text-muted-foreground">매칭 대기중</span>
                            )}
                          </td>
                          <td className="p-4 text-base">
                            <BookingDateDisplay date={booking.booking_date} format="date-only" />
                            <span className="ml-2 font-semibold">{booking.start_time.slice(0, 5)}</span>
                          </td>
                          <td className="p-4">
                            {(() => {
                              const payment = getPayment(booking.payments)
                              const paymentBadge = getPaymentBadge(payment)
                              return (
                                <div className="space-y-1">
                                  <Badge variant={paymentBadge.variant} className="text-sm px-2 py-1">
                                    {paymentBadge.label}
                                  </Badge>
                                  {booking.total_price && (
                                    <div className="text-sm font-semibold">
                                      {booking.total_price.toLocaleString('ko-KR')}원
                                    </div>
                                  )}
                                </div>
                              )
                            })()}
                          </td>
                          <td className="p-4 text-base text-muted-foreground">
                            <BookingDateDisplay date={booking.updated_at || booking.created_at} format="created" />
                          </td>
                          <td className="p-4">
                            <Badge variant={statusBadge.variant} className="text-base px-3 py-1">{statusBadge.label}</Badge>
                          </td>
                          <td className="p-4">
                            <Link href={`/customer/bookings/${booking.id}`}>
                              <Button variant="ghost" size="default" className="h-12 text-base">
                                <Eye className="h-5 w-5 mr-2" />
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

              {/* 페이지네이션 - 시니어 친화적 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <Link href={`/customer/bookings?page=${Math.max(1, currentPage - 1)}&${new URLSearchParams(params as Record<string, string>).toString()}`}>
                    <Button variant="outline" size="lg" className="h-12 px-6 text-lg border-2" disabled={currentPage === 1}>
                      이전
                    </Button>
                  </Link>
                  <span className="text-lg md:text-xl font-medium px-4">
                    {currentPage} / {totalPages}
                  </span>
                  <Link href={`/customer/bookings?page=${Math.min(totalPages, currentPage + 1)}&${new URLSearchParams(params as Record<string, string>).toString()}`}>
                    <Button variant="outline" size="lg" className="h-12 px-6 text-lg border-2" disabled={currentPage === totalPages}>
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
