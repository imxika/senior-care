import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Users,
  Star,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
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
import { AdminStatsCharts } from '@/components/admin-stats-charts'

export default async function AdminStatsPage() {
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

  // 전체 예약 조회
  const { data: bookings } = await serviceSupabase
    .from('bookings')
    .select(`
      *,
      trainer:trainers(id, hourly_rate)
    `)
    .order('created_at', { ascending: false })

  // 트레이너 조회
  const { data: trainers } = await serviceSupabase
    .from('trainers')
    .select('*, profile:profiles!profile_id(full_name)')

  // 고객 조회
  const { data: customers } = await serviceSupabase
    .from('customers')
    .select('*, profile:profiles!profile_id(full_name)')

  // 리뷰 조회
  const { data: reviews } = await serviceSupabase
    .from('reviews')
    .select('rating, created_at')

  // 통계 계산
  const totalBookings = bookings?.length || 0
  const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0
  const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0
  const cancelledBookings = bookings?.filter(b => b.status === 'cancelled' || b.status === 'no_show').length || 0

  const totalTrainers = trainers?.length || 0
  const activeTrainers = trainers?.filter(t => t.is_active && t.is_verified).length || 0
  const pendingTrainers = trainers?.filter(t => !t.is_verified).length || 0

  const totalCustomers = customers?.length || 0

  const totalReviews = reviews?.length || 0
  const averageRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  // 매출 계산 (완료된 예약 기준)
  const totalRevenue = bookings
    ?.filter(b => b.status === 'completed')
    .reduce((sum, b) => {
      const basePrice = PRICING[b.service_type as keyof typeof PRICING] || 0
      const priceMultiplier = b.price_multiplier ?? 1
      const durationHours = b.duration_hours ?? 1
      const finalPrice = Number(basePrice) * priceMultiplier * durationHours
      return sum + finalPrice
    }, 0) || 0

  // 이번 달 통계
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const thisMonthBookings = bookings?.filter(b => {
    const bookingDate = new Date(b.booking_date)
    return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear
  }) || []

  const thisMonthRevenue = thisMonthBookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => {
      const basePrice = PRICING[b.service_type as keyof typeof PRICING] || 0
      const priceMultiplier = b.price_multiplier ?? 1
      const durationHours = b.duration_hours ?? 1
      const finalPrice = Number(basePrice) * priceMultiplier * durationHours
      return sum + finalPrice
    }, 0)

  // 지난 달 통계 (비교용)
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
  const lastMonthBookings = bookings?.filter(b => {
    const bookingDate = new Date(b.booking_date)
    return bookingDate.getMonth() === lastMonth && bookingDate.getFullYear() === lastMonthYear
  }) || []

  const lastMonthRevenue = lastMonthBookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => {
      const basePrice = PRICING[b.service_type as keyof typeof PRICING] || 0
      const priceMultiplier = b.price_multiplier ?? 1
      const durationHours = b.duration_hours ?? 1
      const finalPrice = Number(basePrice) * priceMultiplier * durationHours
      return sum + finalPrice
    }, 0)

  // 증감률 계산
  const revenueChange = lastMonthRevenue > 0
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
    : '0'
  const bookingChange = lastMonthBookings.length > 0
    ? ((thisMonthBookings.length - lastMonthBookings.length) / lastMonthBookings.length * 100).toFixed(1)
    : '0'

  // 최근 6개월 예약 추이 데이터
  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const targetMonth = currentMonth - i
    const targetYear = targetMonth < 0 ? currentYear - 1 : currentYear
    const adjustedMonth = targetMonth < 0 ? 12 + targetMonth : targetMonth

    const monthBookings = bookings?.filter(b => {
      const bookingDate = new Date(b.booking_date)
      return bookingDate.getMonth() === adjustedMonth && bookingDate.getFullYear() === targetYear
    }) || []

    const monthRevenue = monthBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => {
        const basePrice = PRICING[b.service_type as keyof typeof PRICING] || 0
        const priceMultiplier = b.price_multiplier ?? 1
        const durationHours = b.duration_hours ?? 1
        const finalPrice = Number(basePrice) * priceMultiplier * durationHours
        return sum + finalPrice
      }, 0)

    monthlyData.push({
      month: new Date(targetYear, adjustedMonth, 1).toLocaleDateString('ko-KR', { month: 'short' }),
      bookings: monthBookings.length,
      revenue: monthRevenue,
      completed: monthBookings.filter(b => b.status === 'completed').length,
    })
  }

  // 예약 타입별 통계
  const directBookings = bookings?.filter(b => b.booking_type === 'direct').length || 0
  const recommendedBookings = bookings?.filter(b => b.booking_type === 'recommended').length || 0

  // 서비스 타입별 통계
  const serviceTypeStats = {
    home_visit: bookings?.filter(b => b.service_type === 'home_visit').length || 0,
    center_visit: bookings?.filter(b => b.service_type === 'center_visit').length || 0,
    online: bookings?.filter(b => b.service_type === 'online').length || 0,
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
              <BreadcrumbItem>
                <BreadcrumbPage>통계</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">통계 대시보드</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            플랫폼 전체 통계 및 분석
          </p>
        </div>

        {/* Overview Cards with Trends */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 매출</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                {Number(revenueChange) >= 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">+{revenueChange}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-3 w-3 text-red-600" />
                    <span className="text-red-600">{revenueChange}%</span>
                  </>
                )}
                <span className="text-muted-foreground">from last month</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 예약</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBookings}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                {Number(bookingChange) >= 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">+{bookingChange}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-3 w-3 text-red-600" />
                    <span className="text-red-600">{bookingChange}%</span>
                  </>
                )}
                <span className="text-muted-foreground">from last month</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">활성 트레이너</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeTrainers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                총 {totalTrainers}명 중 {activeTrainers}명 활동
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">평균 평점</CardTitle>
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageRating}</div>
              <p className="text-xs text-muted-foreground mt-1">
                총 {totalReviews}개 리뷰
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <AdminStatsCharts
            monthlyData={monthlyData}
            bookingData={monthlyData.map(m => ({
              month: m.month,
              total: m.bookings,
              completed: m.completed
            }))}
          />
        </div>

        {/* Detailed Statistics */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Booking Status */}
          <Card>
            <CardHeader>
              <CardTitle>예약 상태</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">완료</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{completedBookings}</span>
                    <Badge variant="outline" className="text-xs">
                      {totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(0) : 0}%
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">대기 중</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{pendingBookings}</span>
                    <Badge variant="outline" className="text-xs">
                      {totalBookings > 0 ? ((pendingBookings / totalBookings) * 100).toFixed(0) : 0}%
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">취소/노쇼</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{cancelledBookings}</span>
                    <Badge variant="outline" className="text-xs">
                      {totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(0) : 0}%
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Types */}
          <Card>
            <CardHeader>
              <CardTitle>서비스 타입별 통계</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">방문 서비스</span>
                    <span className="text-lg font-bold">{serviceTypeStats.home_visit}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: totalBookings > 0
                          ? `${(serviceTypeStats.home_visit / totalBookings) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">센터 방문</span>
                    <span className="text-lg font-bold">{serviceTypeStats.center_visit}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: totalBookings > 0
                          ? `${(serviceTypeStats.center_visit / totalBookings) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">온라인</span>
                    <span className="text-lg font-bold">{serviceTypeStats.online}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500"
                      style={{
                        width: totalBookings > 0
                          ? `${(serviceTypeStats.online / totalBookings) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
