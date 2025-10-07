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

  // 완료된 예약만 조회 (정산 대상) - Service Role로 RLS 우회
  const { data: completedBookings } = await serviceSupabase
    .from('bookings')
    .select(`
      *,
      trainer:trainers!trainer_id(
        id,
        hourly_rate,
        profile:profiles!profile_id(full_name, avatar_url, email)
      ),
      customer:customers!customer_id(
        profile:profiles!profile_id(full_name)
      )
    `)
    .eq('status', 'completed')
    .not('service_completed_at', 'is', null)
    .order('service_completed_at', { ascending: false })

  // 트레이너별로 그룹화
  const trainerSettlements = new Map<string, {
    trainer: any
    bookings: any[]
    totalRevenue: number
    bookingCount: number
  }>()

  completedBookings?.forEach((booking: any) => {
    const trainerId = booking.trainer?.id
    if (!trainerId) return

    const basePrice = PRICING[booking.service_type as keyof typeof PRICING] || 0
    const finalPrice = basePrice * (booking.price_multiplier || 1) * (booking.duration_hours || 1)

    if (!trainerSettlements.has(trainerId)) {
      trainerSettlements.set(trainerId, {
        trainer: booking.trainer,
        bookings: [],
        totalRevenue: 0,
        bookingCount: 0,
      })
    }

    const settlement = trainerSettlements.get(trainerId)!
    settlement.bookings.push(booking)
    settlement.totalRevenue += finalPrice
    settlement.bookingCount += 1
  })

  // Map을 배열로 변환하고 매출 순으로 정렬
  const settlements = Array.from(trainerSettlements.values()).sort(
    (a, b) => b.totalRevenue - a.totalRevenue
  )

  // 전체 통계
  const totalRevenue = settlements.reduce((sum, s) => sum + s.totalRevenue, 0)
  const totalBookings = settlements.reduce((sum, s) => sum + s.bookingCount, 0)

  // 이번 달 통계
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const thisMonthBookings = completedBookings?.filter((b: any) => {
    const completedDate = new Date(b.service_completed_at)
    return completedDate.getMonth() === currentMonth && completedDate.getFullYear() === currentYear
  }) || []

  const thisMonthRevenue = thisMonthBookings.reduce((sum: number, b: any) => {
    const basePrice = PRICING[b.service_type as keyof typeof PRICING] || 0
    const finalPrice = basePrice * (b.price_multiplier || 1) * (b.duration_hours || 1)
    return sum + finalPrice
  }, 0)

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 매출</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatPrice(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                누적 매출
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">이번 달</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatPrice(thisMonthRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {thisMonthBookings.length}건 완료
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">완료 예약</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBookings}</div>
              <p className="text-xs text-muted-foreground mt-1">
                총 예약 건수
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">활성 트레이너</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{settlements.length}</div>
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
                      <div className="flex flex-col items-end gap-1 md:min-w-[150px]">
                        <div className="text-2xl md:text-3xl font-bold text-green-600">
                          {formatPrice(settlement.totalRevenue)}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          총 {settlement.bookingCount}건 완료
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

                    {/* Bookings List */}
                    <div className="space-y-3">
                      {settlement.bookings.slice(0, 5).map((booking: any) => {
                        const basePrice = PRICING[booking.service_type as keyof typeof PRICING] || 0
                        const finalPrice = basePrice * (booking.price_multiplier || 1) * (booking.duration_hours || 1)

                        return (
                          <div
                            key={booking.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {booking.customer?.profiles?.full_name || '고객'}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {booking.booking_type === 'direct' ? '지정' : '추천'}
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
                                <span>{booking.duration_hours}시간</span>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="font-semibold text-sm text-green-600">
                                {formatPrice(finalPrice)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(booking.service_completed_at).toLocaleDateString('ko-KR')}
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
