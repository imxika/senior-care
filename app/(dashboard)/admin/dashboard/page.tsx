import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Users, UserCheck, Clock, Calendar, ExternalLink, AlertCircle, ArrowUpRight, Activity, UserCog, DollarSign, TrendingUp, CheckCircle, XCircle } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export default async function AdminDashboard() {
  const supabase = await createClient()

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

  // 통계 데이터 가져오기 (Service Role로 RLS 우회)
  const { count: totalTrainers } = await serviceSupabase
    .from('trainers')
    .select('*', { count: 'exact', head: true })

  const { count: pendingTrainers } = await serviceSupabase
    .from('trainers')
    .select('*', { count: 'exact', head: true })
    .eq('is_verified', false)

  const { count: activeTrainers } = await serviceSupabase
    .from('trainers')
    .select('*', { count: 'exact', head: true })
    .eq('is_verified', true)
    .eq('is_active', true)

  const { count: totalCustomers } = await serviceSupabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('user_type', 'customer')

  // 추천 예약 매칭 대기 수
  const { count: pendingRecommendedBookings } = await serviceSupabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('booking_type', 'recommended')
    .eq('status', 'pending')
    .is('trainer_id', null)

  // 예약 통계
  const { count: totalBookings } = await serviceSupabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })

  const { count: pendingBookings } = await serviceSupabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { count: confirmedBookings } = await serviceSupabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'confirmed')

  const { count: completedBookings } = await serviceSupabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')

  const { count: cancelledBookings } = await serviceSupabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'cancelled')

  // 서비스 타입별 통계
  const { data: serviceTypeStats } = await serviceSupabase
    .from('bookings')
    .select('service_type')
    .not('service_type', 'is', null)

  const serviceTypeCounts = serviceTypeStats?.reduce((acc: Record<string, number>, booking) => {
    const type = booking.service_type
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {}) || {}

  // 완료된 예약의 총 매출 (completed만)
  const { data: completedBookingsData } = await serviceSupabase
    .from('bookings')
    .select(`
      total_price,
      status
    `)
    .eq('status', 'completed')

  const totalRevenue = completedBookingsData?.reduce((sum, booking) => {
    return sum + (booking.total_price || 0)
  }, 0) || 0

  // 이번 달 매출
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { data: thisMonthBookings } = await serviceSupabase
    .from('bookings')
    .select('total_price')
    .eq('status', 'completed')
    .gte('booking_date', firstDayOfMonth)

  const thisMonthRevenue = thisMonthBookings?.reduce((sum, booking) => {
    return sum + (booking.total_price || 0)
  }, 0) || 0

  return (
    <>
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/admin">관리자</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>대시보드</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
            <p className="text-muted-foreground mt-1">
              안녕하세요, {profile?.full_name}님
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/trainers">
              트레이너 관리
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Alerts */}
        <div className="space-y-3">
          {pendingRecommendedBookings && pendingRecommendedBookings > 0 && (
            <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
              <UserCog className="h-4 w-4 text-green-600 dark:text-green-500" />
              <AlertTitle className="text-green-900 dark:text-green-100">추천 예약 매칭 대기</AlertTitle>
              <AlertDescription className="text-green-800 dark:text-green-200">
                {pendingRecommendedBookings}건의 추천 예약이 트레이너 매칭을 기다리고 있습니다.
                <Link href="/admin/bookings?status=pending" className="ml-2 font-medium underline underline-offset-4 hover:text-green-900">
                  지금 매칭하기
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {pendingTrainers && pendingTrainers > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
              <AlertTitle className="text-yellow-900 dark:text-yellow-100">승인 대기 중인 트레이너</AlertTitle>
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                {pendingTrainers}명의 트레이너가 승인을 기다리고 있습니다.
                <Link href="/admin/trainers" className="ml-2 font-medium underline underline-offset-4 hover:text-yellow-900">
                  지금 확인하기
                </Link>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Stats Grid - 사용자 통계 */}
        <div>
          <h2 className="text-lg font-semibold mb-3">사용자 통계</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">전체 트레이너</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTrainers || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  등록된 트레이너
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">승인 대기</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{pendingTrainers || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  검토가 필요합니다
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">활동 중</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{activeTrainers || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  활성 트레이너
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">고객 수</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{totalCustomers || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  등록된 고객
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 예약 통계 */}
        <div>
          <h2 className="text-lg font-semibold mb-3">예약 통계</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">전체 예약</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalBookings || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  총 예약 건수
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">대기 중</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{pendingBookings || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  승인 대기
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">예약 확정</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{confirmedBookings || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  확정된 예약
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">완료</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{completedBookings || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  서비스 완료
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">취소</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{cancelledBookings || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  취소된 예약
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 매출 통계 */}
        <div>
          <h2 className="text-lg font-semibold mb-3">매출 통계</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 매출</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₩{totalRevenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  완료된 예약 기준
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">이번 달 매출</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ₩{thisMonthRevenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {now.getMonth() + 1}월 매출
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 서비스 타입별 통계 */}
        <div>
          <h2 className="text-lg font-semibold mb-3">서비스 타입별 예약</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(serviceTypeCounts).length > 0 ? (
              Object.entries(serviceTypeCounts).map(([type, count]) => (
                <Card key={type}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium capitalize">{type}</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{count}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((count / (totalBookings || 1)) * 100).toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="col-span-full">
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground text-sm">
                    아직 예약이 없습니다
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-sm">트레이너 관리</CardTitle>
                  <CardDescription className="text-xs">승인 및 Sanity 게시</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/admin/trainers">
                  바로가기
                  <ArrowUpRight className="ml-2 h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
                  <ExternalLink className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-sm">Sanity Studio</CardTitle>
                  <CardDescription className="text-xs">CMS 관리</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm" className="w-full">
                <a href="http://localhost:3333/senior-care" target="_blank" rel="noopener noreferrer">
                  열기
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-sm">예약 관리</CardTitle>
                  <CardDescription className="text-xs">예약 현황 확인</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/admin/bookings">
                  바로가기
                  <ArrowUpRight className="ml-2 h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
                  <UserCog className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-sm">추천 예약 매칭</CardTitle>
                  <CardDescription className="text-xs">
                    {pendingRecommendedBookings ? `${pendingRecommendedBookings}건 대기` : '대기 없음'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/admin/bookings?status=pending">
                  바로가기
                  <ArrowUpRight className="ml-2 h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
