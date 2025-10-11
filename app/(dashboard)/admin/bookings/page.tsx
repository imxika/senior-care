import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
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
import { BookingsTable } from './bookings-table'

interface PageProps {
  searchParams: Promise<{
    status?: string
    type?: string
    search?: string
    sort?: string
    direction?: string
    page?: string
  }>
}

interface BookingWithRelations {
  id: string
  customer_id: string
  trainer_id?: string
  booking_type: string
  service_type: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  matching_status?: string
  total_price: number
  created_at: string
  updated_at: string
  admin_matched_at?: string
  customer?: {
    id: string
    profile?: {
      full_name?: string
      email?: string
      phone?: string
    }
  }
  trainer?: {
    id: string
    hourly_rate?: number
    specialties?: string[]
    profile?: {
      full_name?: string
      email?: string
    }
  }
  payments?: Array<{
    id: string
    amount: string
    currency: string
    payment_method: string
    payment_status: string
    payment_provider: string
    paid_at?: string
    created_at: string
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

  // Service Role client for RLS bypass (admin access)
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

  // 모든 예약 목록 가져오기 (Service Role로 RLS 우회)
  const { data: bookings, error} = await serviceSupabase
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
      admin_matched_at,
      customer:customers!customer_id(
        id,
        profile:profiles!profile_id(
          full_name,
          email,
          phone
        )
      ),
      trainer:trainers!trainer_id(
        id,
        hourly_rate,
        specialties,
        profile:profiles!profile_id(
          full_name,
          email
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
    .order('created_at', { ascending: false })
    .limit(200) as { data: BookingWithRelations[] | null; error: Error | null }

  if (error) {
    console.error('❌ [ADMIN] Error fetching bookings:', error)
  }

  // 디버깅 로그
  console.log('📊 [ADMIN] Bookings fetched:', {
    total: bookings?.length || 0,
    error: error?.message,
    sample: bookings?.[0] ? {
      id: bookings[0].id,
      status: bookings[0].status,
      customer: bookings[0].customer?.profile?.full_name,
      trainer: bookings[0].trainer?.profile?.full_name
    } : null
  })

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
      const customerName = b.customer?.profile?.full_name?.toLowerCase() || ''
      const customerEmail = b.customer?.profile?.email?.toLowerCase() || ''
      const trainerName = b.trainer?.profile?.full_name?.toLowerCase() || ''
      const bookingId = b.id.toLowerCase()

      return customerName.includes(searchLower) ||
             customerEmail.includes(searchLower) ||
             trainerName.includes(searchLower) ||
             bookingId.includes(searchLower)
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
      case 'customer_name':
        const nameA = a.customer?.profile?.full_name || ''
        const nameB = b.customer?.profile?.full_name || ''
        comparison = nameA.localeCompare(nameB)
        break
      case 'status':
        comparison = a.status.localeCompare(b.status)
        break
      default:
        comparison = 0
    }

    return sortDirection === 'asc' ? comparison : -comparison
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
  // Pagination will be handled by BookingsTable component
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
        <BookingsTable
          bookings={filteredBookings}
          currentPage={currentPage}
          totalPages={totalPages}
          params={params}
        />
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
