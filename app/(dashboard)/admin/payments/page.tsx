import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { CreditCard, DollarSign, TrendingUp } from 'lucide-react'
import { PaymentsTableRow } from '@/components/admin/payments-table-row'

interface PageProps {
  searchParams: Promise<{
    status?: string
    provider?: string
  }>
}

// Supabase query result type (foreign keys return arrays)
interface SupabasePaymentResult {
  id: string
  amount: number
  currency: string
  payment_method: string
  payment_status: string
  payment_provider: string
  paid_at: string | null
  created_at: string
  booking: Array<{
    id: string
    booking_date: string
    start_time: string
    service_type: string
    customer: Array<{
      id: string
      profile: Array<{
        full_name: string | null
        email: string | null
      }>
    }>
    trainer: Array<{
      id: string
      profile: Array<{
        full_name: string | null
      }>
    }>
  }>
}

// Normalized payment type for PaymentsTableRow component
interface NormalizedPayment {
  id: string
  amount: string
  payment_status: string
  payment_provider: string
  payment_method?: string
  paid_at?: string
  created_at: string
  booking?: {
    id: string
    booking_date?: string
    start_time?: string
    customer?: {
      profile?: {
        full_name?: string
      }
    }
  }
}

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  // 인증 및 권한 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
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

  // 전체 결제 내역 조회
  const { data: payments, error } = await serviceSupabase
    .from('payments')
    .select(`
      id,
      amount,
      currency,
      payment_method,
      payment_status,
      payment_provider,
      paid_at,
      created_at,
      booking:bookings!booking_id(
        id,
        booking_date,
        start_time,
        service_type,
        customer:customers!customer_id(
          id,
          profile:profiles!profile_id(
            full_name,
            email
          )
        ),
        trainer:trainers!trainer_id(
          id,
          profile:profiles!profile_id(
            full_name
          )
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching payments:', error)
  }

  // Normalize Supabase array results to flat objects
  const rawPayments = (payments || []) as unknown as SupabasePaymentResult[]
  const paymentsList: NormalizedPayment[] = rawPayments.map((payment) => {
    const bookingData = Array.isArray(payment.booking) ? payment.booking[0] : undefined
    const customerData = bookingData?.customer ? (Array.isArray(bookingData.customer) ? bookingData.customer[0] : bookingData.customer) : undefined
    const profileData = customerData?.profile ? (Array.isArray(customerData.profile) ? customerData.profile[0] : customerData.profile) : undefined

    return {
      id: payment.id,
      amount: String(payment.amount),
      payment_status: payment.payment_status,
      payment_provider: payment.payment_provider,
      payment_method: payment.payment_method,
      paid_at: payment.paid_at || undefined,
      created_at: payment.created_at,
      booking: bookingData ? {
        id: bookingData.id,
        booking_date: bookingData.booking_date,
        start_time: bookingData.start_time,
        customer: profileData ? {
          profile: {
            full_name: profileData.full_name || undefined
          }
        } : undefined
      } : undefined
    }
  })

  // 필터링
  let filteredPayments = paymentsList

  if (params.status && params.status !== 'all') {
    if (params.status === 'failed') {
      // failed 필터는 failed와 cancelled 모두 포함
      filteredPayments = filteredPayments.filter(p =>
        p.payment_status === 'failed' || p.payment_status === 'cancelled'
      )
    } else {
      filteredPayments = filteredPayments.filter(p => p.payment_status === params.status)
    }
  }

  if (params.provider && params.provider !== 'all') {
    filteredPayments = filteredPayments.filter(p => p.payment_provider === params.provider)
  }

  // 통계 계산
  const totalPaid = paymentsList
    .filter(p => p.payment_status === 'paid')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0)

  const todayPaid = paymentsList
    .filter(p => {
      if (p.payment_status !== 'paid' || !p.paid_at) return false
      const today = new Date().toDateString()
      const paidDate = new Date(p.paid_at).toDateString()
      return today === paidDate
    })
    .reduce((sum, p) => sum + parseFloat(p.amount), 0)

  const thisMonthPaid = paymentsList
    .filter(p => {
      if (p.payment_status !== 'paid' || !p.paid_at) return false
      const now = new Date()
      const paidDate = new Date(p.paid_at)
      return paidDate.getMonth() === now.getMonth() &&
             paidDate.getFullYear() === now.getFullYear()
    })
    .reduce((sum, p) => sum + parseFloat(p.amount), 0)

  const stats = {
    total: paymentsList.length,
    paid: paymentsList.filter(p => p.payment_status === 'paid').length,
    pending: paymentsList.filter(p => p.payment_status === 'pending').length,
    failed: paymentsList.filter(p => p.payment_status === 'failed' || p.payment_status === 'cancelled').length,
    cancelled: paymentsList.filter(p => p.payment_status === 'cancelled').length,
    totalPaid,
    todayPaid,
    thisMonthPaid,
    tossCount: paymentsList.filter(p => p.payment_provider === 'toss').length,
    stripeCount: paymentsList.filter(p => p.payment_provider === 'stripe').length,
  }

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
                <BreadcrumbPage>결제 관리</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">💳 결제 관리</h1>
          <p className="text-muted-foreground mt-1">
            전체 결제 현황 및 통계 ({filteredPayments.length}/{paymentsList.length})
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 결제 완료</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPaid.toLocaleString()}원</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.paid}건 완료
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">오늘 매출</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.todayPaid.toLocaleString()}원</div>
              <p className="text-xs text-muted-foreground mt-1">
                오늘 결제 완료
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">이번 달 매출</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.thisMonthPaid.toLocaleString()}원</div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date().getMonth() + 1}월 누적
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">결제 현황</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}건</div>
              <div className="flex gap-2 text-xs mt-1">
                <span className="text-green-600">완료 {stats.paid}</span>
                <span className="text-yellow-600">대기 {stats.pending}</span>
                <span className="text-red-600">실패/취소 {stats.failed}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Provider Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">💳 결제 수단별</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Toss Payments</span>
                <Badge variant="outline">{stats.tossCount}건</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Stripe</span>
                <Badge variant="outline">{stats.stripeCount}건</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">📊 상태별</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">✅ 결제 완료</span>
                <Badge>{stats.paid}건</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">⏳ 결제 대기</span>
                <Badge variant="secondary">{stats.pending}건</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">❌ 결제 실패/취소</span>
                <Badge variant="destructive">{stats.failed}건</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🔍 필터</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex gap-2">
                <span className="text-sm font-medium">상태:</span>
                <Link href="/admin/payments?status=all" className={params.status === 'all' || !params.status ? 'font-bold' : ''}>
                  전체
                </Link>
                <Link href="/admin/payments?status=paid" className={params.status === 'paid' ? 'font-bold' : ''}>
                  완료
                </Link>
                <Link href="/admin/payments?status=pending" className={params.status === 'pending' ? 'font-bold' : ''}>
                  대기
                </Link>
                <Link href="/admin/payments?status=failed" className={params.status === 'failed' ? 'font-bold' : ''}>
                  실패/취소
                </Link>
              </div>
              <Separator orientation="vertical" />
              <div className="flex gap-2">
                <span className="text-sm font-medium">제공자:</span>
                <Link href="/admin/payments?provider=all" className={params.provider === 'all' || !params.provider ? 'font-bold' : ''}>
                  전체
                </Link>
                <Link href="/admin/payments?provider=toss" className={params.provider === 'toss' ? 'font-bold' : ''}>
                  Toss
                </Link>
                <Link href="/admin/payments?provider=stripe" className={params.provider === 'stripe' ? 'font-bold' : ''}>
                  Stripe
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>결제 내역</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>결제일시</TableHead>
                  <TableHead>고객</TableHead>
                  <TableHead>예약일</TableHead>
                  <TableHead>금액</TableHead>
                  <TableHead>결제수단</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>제공자</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      결제 내역이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <PaymentsTableRow key={payment.id} payment={payment} />
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
