import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DollarSign,
  Calendar,
  CheckCircle,
  TrendingUp,
  Users,
  ArrowUpRight,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { formatPrice } from '@/lib/utils'
import { PRICING } from '@/lib/constants'
import Link from 'next/link'

// Supabase query result type (foreign keys return arrays)
interface SupabasePaymentResult {
  id: string
  amount: number
  payment_status: string
  paid_at: string | null
  payment_provider: string
  booking: Array<{
    id: string
    booking_date: string
    start_time: string
    end_time: string
    duration_minutes: number
    service_type: string
    booking_type: string
    service_completed_at: string | null
    trainer: Array<{
      id: string
      hourly_rate: number | null
      profile: Array<{
        full_name: string | null
        avatar_url: string | null
        email: string | null
      }>
    }>
    customer: Array<{
      profile: Array<{
        full_name: string | null
      }>
    }>
  }>
}

// Normalized payment type
interface PaymentWithBooking {
  id: string
  amount: string
  paid_at: string | null
  payment_provider: string
  booking: {
    id: string
    booking_date: string
    start_time: string
    duration_minutes: number
    service_type: string
    booking_type: string
    trainer?: {
      id: string
      hourly_rate?: number
      profile?: {
        full_name?: string
        avatar_url?: string | null
        email?: string
      }
    }
    customer?: {
      profile?: {
        full_name?: string
      }
    }
  }
}

interface TrainerSettlement {
  trainer: {
    id: string
    hourly_rate?: number
    profile?: {
      full_name?: string
      avatar_url?: string | null
      email?: string
    }
  }
  payments: PaymentWithBooking[]
  totalRevenue: number
  platformCommission: number
  settlementAmount: number
  bookingCount: number
}

export default async function AdminSettlementsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'admin') redirect('/')

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

  // 결제 완료된 예약만 조회 (정산 대상) - Service Role로 RLS 우회
  const { data: rawPayments } = await serviceSupabase
    .from('payments')
    .select(`
      id,
      amount,
      payment_status,
      paid_at,
      payment_provider,
      booking:bookings!booking_id(
        id,
        booking_date,
        start_time,
        end_time,
        duration_minutes,
        service_type,
        booking_type,
        service_completed_at,
        trainer:trainers!trainer_id(
          id,
          hourly_rate,
          profile:profiles!profile_id(full_name, avatar_url, email)
        ),
        customer:customers!customer_id(
          profile:profiles!profile_id(full_name)
        )
      )
    `)
    .eq('payment_status', 'paid')
    .order('paid_at', { ascending: false })

  // Normalize Supabase array results to flat objects
  const supabasePayments = (rawPayments || []) as unknown as SupabasePaymentResult[]
  const payments: PaymentWithBooking[] = supabasePayments.map((payment) => {
    const bookingData = Array.isArray(payment.booking) ? payment.booking[0] : undefined
    const trainerData = bookingData?.trainer ? (Array.isArray(bookingData.trainer) ? bookingData.trainer[0] : bookingData.trainer) : undefined
    const trainerProfile = trainerData?.profile ? (Array.isArray(trainerData.profile) ? trainerData.profile[0] : trainerData.profile) : undefined
    const customerData = bookingData?.customer ? (Array.isArray(bookingData.customer) ? bookingData.customer[0] : bookingData.customer) : undefined
    const customerProfile = customerData?.profile ? (Array.isArray(customerData.profile) ? customerData.profile[0] : customerData.profile) : undefined

    return {
      id: payment.id,
      amount: String(payment.amount),
      paid_at: payment.paid_at,
      payment_provider: payment.payment_provider,
      booking: {
        id: bookingData?.id || '',
        booking_date: bookingData?.booking_date || '',
        start_time: bookingData?.start_time || '',
        duration_minutes: bookingData?.duration_minutes || 0,
        service_type: bookingData?.service_type || '',
        booking_type: bookingData?.booking_type || '',
        trainer: trainerData ? {
          id: trainerData.id,
          hourly_rate: trainerData.hourly_rate || undefined,
          profile: trainerProfile ? {
            full_name: trainerProfile.full_name || undefined,
            avatar_url: trainerProfile.avatar_url,
            email: trainerProfile.email || undefined
          } : undefined
        } : undefined,
        customer: customerProfile ? {
          profile: {
            full_name: customerProfile.full_name || undefined
          }
        } : undefined
      }
    }
  })

  // 트레이너별로 그룹화 (결제 기반)
  const platformCommissionRate = 0.15 // 15% 수수료

  const trainerSettlements = new Map<string, TrainerSettlement>()

  payments.forEach((payment: PaymentWithBooking) => {
    const booking = payment.booking
    if (!booking?.trainer) return

    const trainer = booking.trainer
    const trainerId = trainer.id
    if (!trainerId) return

    const amount = parseFloat(payment.amount)
    const commission = amount * platformCommissionRate
    const settlement = amount - commission

    if (!trainerSettlements.has(trainerId)) {
      trainerSettlements.set(trainerId, {
        trainer,
        payments: [],
        totalRevenue: 0,
        platformCommission: 0,
        settlementAmount: 0,
        bookingCount: 0,
      })
    }

    const data = trainerSettlements.get(trainerId)!
    data.payments.push(payment)
    data.totalRevenue += amount
    data.platformCommission += commission
    data.settlementAmount += settlement
    data.bookingCount += 1
  })

  // Map을 배열로 변환하고 매출 순으로 정렬
  const settlements = Array.from(trainerSettlements.values()).sort(
    (a, b) => b.totalRevenue - a.totalRevenue
  )

  // 전체 통계
  const totalRevenue = settlements.reduce((sum, s) => sum + s.totalRevenue, 0)
  const totalCommission = settlements.reduce((sum, s) => sum + s.platformCommission, 0)
  const totalSettlement = settlements.reduce((sum, s) => sum + s.settlementAmount, 0)
  const totalBookings = settlements.reduce((sum, s) => sum + s.bookingCount, 0)

  // 이번 달 통계
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const thisMonthPayments = payments.filter((p: PaymentWithBooking) => {
    if (!p.paid_at) return false
    const paidDate = new Date(p.paid_at)
    return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear
  })

  const thisMonthRevenue = thisMonthPayments.reduce((sum: number, p: PaymentWithBooking) => {
    return sum + parseFloat(p.amount)
  }, 0)

  const thisMonthCommission = thisMonthRevenue * platformCommissionRate

  return (
    <>
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>정산 관리</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">정산 관리</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            트레이너별 매출 및 정산 내역
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 매출</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalBookings}건 결제 완료
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">플랫폼 수수료</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatPrice(totalCommission)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                15% 수수료
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">트레이너 정산액</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatPrice(totalSettlement)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                지급 예정 (85%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">이번 달</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{formatPrice(thisMonthRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {thisMonthPayments.length}건
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">활동 트레이너</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{settlements.length}명</div>
              <p className="text-xs text-muted-foreground mt-1">
                정산 대상
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trainer Settlements */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">트레이너별 정산 내역</h2>

          {settlements.length > 0 ? (
            <div className="grid gap-4">
              {settlements.map((settlement) => (
                <Card key={settlement.trainer.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Trainer Info */}
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 md:h-14 md:w-14">
                          <AvatarImage src={settlement.trainer.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-lg">
                            {settlement.trainer.profile?.full_name?.charAt(0) || 'T'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/trainers/${settlement.trainer.id}`}
                              className="font-semibold text-base md:text-lg hover:text-primary transition-colors hover:underline"
                            >
                              {settlement.trainer.profile?.full_name || '트레이너'}
                            </Link>
                            <Badge variant="secondary" className="text-xs">트레이너</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {settlement.trainer.profile?.email}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              시급: {formatPrice(settlement.trainer.hourly_rate || 0)}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Revenue Info */}
                      <div className="flex flex-col items-end gap-1 md:min-w-[200px]">
                        <div className="text-xs text-muted-foreground">정산 금액 (85%)</div>
                        <div className="text-2xl md:text-3xl font-bold text-blue-600">
                          {formatPrice(settlement.settlementAmount)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          매출: {formatPrice(settlement.totalRevenue)} · 수수료: -{formatPrice(settlement.platformCommission)}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {settlement.bookingCount}건 완료
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4">
                    {/* Recent Bookings Header */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium">최근 완료 예약</h3>
                      <Link
                        href={`/admin/bookings?trainer=${settlement.trainer.id}&status=completed`}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        전체 보기
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>

                    {/* Payments List */}
                    <div className="space-y-3">
                      {settlement.payments.slice(0, 5).map((payment) => {
                        const booking = payment.booking
                        const customer = Array.isArray(booking?.customer) ? booking.customer[0] : booking?.customer
                        const customerProfile = Array.isArray(customer?.profile) ? customer.profile[0] : customer?.profile

                        const amount = parseFloat(payment.amount)
                        const commission = amount * platformCommissionRate
                        const settlementAmount = amount - commission

                        return (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {customerProfile?.full_name || '고객'}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {booking.booking_type === 'direct' ? '지정' : '추천'}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {payment.payment_provider === 'stripe' ? 'Stripe' : 'Toss'}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {new Date(booking.booking_date).toLocaleDateString('ko-KR')}
                                </span>
                                <span>·</span>
                                <span>
                                  {booking.service_type === 'home_visit' ? '방문' : booking.service_type === 'center_visit' ? '센터' : '온라인'}
                                </span>
                                <span>·</span>
                                <span>{Math.round(booking.duration_minutes / 60)}시간</span>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="font-semibold text-sm text-blue-600">
                                {formatPrice(settlementAmount)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                매출 {formatPrice(amount)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('ko-KR') : '-'}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  아직 정산 내역이 없습니다.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
