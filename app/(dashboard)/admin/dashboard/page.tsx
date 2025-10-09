import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Calendar, AlertCircle, ArrowUpRight, DollarSign, XCircle, UserCog, Users, ExternalLink, TrendingUp, BarChart3 } from 'lucide-react'
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

  // 오늘 날짜 기준 계산
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  // 1. 오늘의 신규 예약 (승인 대기)
  const { count: todayPendingBookings } = await serviceSupabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .gte('created_at', todayISO)

  // 2. 추천 예약 매칭 대기 수
  const { count: pendingRecommendedBookings } = await serviceSupabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('booking_type', 'recommended')
    .eq('status', 'pending')
    .is('trainer_id', null)

  // 3. 미결제 건수 (pending 또는 failed)
  const { count: unpaidPayments } = await serviceSupabase
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .in('payment_status', ['pending', 'failed'])

  // 4. 트레이너 승인 대기
  const { count: pendingTrainers } = await serviceSupabase
    .from('trainers')
    .select('*', { count: 'exact', head: true })
    .eq('is_verified', false)

  // 5. 오늘의 매출 (결제 완료 기준)
  const { data: todayPayments } = await serviceSupabase
    .from('payments')
    .select('amount')
    .eq('payment_status', 'paid')
    .gte('paid_at', todayISO)

  const todayRevenue = todayPayments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0

  // 6. 이번 달 매출
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const { data: monthPayments } = await serviceSupabase
    .from('payments')
    .select('amount')
    .eq('payment_status', 'paid')
    .gte('paid_at', firstDayOfMonth.toISOString())

  const monthRevenue = monthPayments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0

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
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
          <p className="text-muted-foreground mt-1">
            안녕하세요, {profile?.full_name}님. 오늘 확인이 필요한 항목들입니다.
          </p>
        </div>

        {/* Alerts - 즉시 액션이 필요한 항목 */}
        <div className="space-y-3">
          {pendingRecommendedBookings && pendingRecommendedBookings > 0 && (
            <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
              <UserCog className="h-4 w-4 text-green-600 dark:text-green-500" />
              <AlertTitle className="text-green-900 dark:text-green-100">🎯 추천 예약 매칭 필요</AlertTitle>
              <AlertDescription className="text-green-800 dark:text-green-200">
                {pendingRecommendedBookings}건의 추천 예약이 트레이너 매칭을 기다리고 있습니다.
                <Button asChild variant="link" className="ml-2 h-auto p-0 text-green-900 underline underline-offset-4 hover:text-green-700">
                  <Link href="/admin/bookings?status=pending">
                    지금 매칭하기 →
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {pendingTrainers && pendingTrainers > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
              <AlertTitle className="text-yellow-900 dark:text-yellow-100">⏳ 트레이너 승인 대기</AlertTitle>
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                {pendingTrainers}명의 트레이너가 승인을 기다리고 있습니다.
                <Button asChild variant="link" className="ml-2 h-auto p-0 text-yellow-900 underline underline-offset-4 hover:text-yellow-700">
                  <Link href="/admin/trainers">
                    지금 확인하기 →
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {unpaidPayments && unpaidPayments > 0 && (
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
              <DollarSign className="h-4 w-4 text-orange-600 dark:text-orange-500" />
              <AlertTitle className="text-orange-900 dark:text-orange-100">💳 미결제 건수</AlertTitle>
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                {unpaidPayments}건의 미결제 건이 있습니다.
                <Button asChild variant="link" className="ml-2 h-auto p-0 text-orange-900 underline underline-offset-4 hover:text-orange-700">
                  <Link href="/admin/payments">
                    확인하기 →
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Key Metrics - 핵심 지표 */}
        <div>
          <h2 className="text-xl font-semibold mb-4">📊 오늘의 핵심 지표</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* 오늘 신규 예약 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">오늘 신규 예약</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{todayPendingBookings || 0}건</div>
                <p className="text-xs text-muted-foreground mt-1">
                  승인 대기 중
                </p>
                <Button asChild variant="link" size="sm" className="mt-2 h-auto p-0 text-xs">
                  <Link href="/admin/bookings?status=pending">
                    예약 관리 →
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* 추천 매칭 대기 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">추천 매칭 대기</CardTitle>
                <UserCog className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{pendingRecommendedBookings || 0}건</div>
                <p className="text-xs text-muted-foreground mt-1">
                  트레이너 배정 필요
                </p>
                <Button asChild variant="link" size="sm" className="mt-2 h-auto p-0 text-xs">
                  <Link href="/admin/bookings?status=pending">
                    매칭하기 →
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* 미결제 건수 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">미결제 건수</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{unpaidPayments || 0}건</div>
                <p className="text-xs text-muted-foreground mt-1">
                  확인 필요
                </p>
                <Button asChild variant="link" size="sm" className="mt-2 h-auto p-0 text-xs">
                  <Link href="/admin/payments">
                    결제 관리 →
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* 오늘 매출 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">오늘 매출</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  ₩{todayRevenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  결제 완료 기준
                </p>
                <Button asChild variant="link" size="sm" className="mt-2 h-auto p-0 text-xs">
                  <Link href="/admin/analytics">
                    분석 보기 →
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 이번 달 요약 */}
        <div>
          <h2 className="text-xl font-semibold mb-4">📈 이번 달 요약</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>이번 달 총 매출</CardTitle>
                    <CardDescription className="mt-1">
                      {today.getMonth() + 1}월 누적 (결제 완료 기준)
                    </CardDescription>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-600">
                  ₩{monthRevenue.toLocaleString()}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/admin/analytics">
                      상세 분석 보기
                      <ArrowUpRight className="ml-2 h-3 w-3" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/admin/settlements">
                      정산 관리
                      <ArrowUpRight className="ml-2 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>트레이너 승인 대기</CardTitle>
                    <CardDescription className="mt-1">
                      검토가 필요한 신규 트레이너
                    </CardDescription>
                  </div>
                  <Users className="h-8 w-8 text-yellow-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-yellow-600">
                  {pendingTrainers || 0}명
                </div>
                <div className="mt-4">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/admin/trainers">
                      트레이너 관리
                      <ArrowUpRight className="ml-2 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions - 빠른 액션 */}
        <div>
          <h2 className="text-xl font-semibold mb-4">⚡ 빠른 액션</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                    <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">예약 관리</CardTitle>
                    <CardDescription className="text-xs">전체 예약 확인</CardDescription>
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

            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
                    <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">결제 관리</CardTitle>
                    <CardDescription className="text-xs">결제 현황 확인</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/admin/payments">
                    바로가기
                    <ArrowUpRight className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
                    <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">결제 분석</CardTitle>
                    <CardDescription className="text-xs">차트 및 통계</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/admin/analytics">
                    바로가기
                    <ArrowUpRight className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950">
                    <ExternalLink className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">Sanity CMS</CardTitle>
                    <CardDescription className="text-xs">콘텐츠 관리</CardDescription>
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
          </div>
        </div>
      </div>
    </>
  )
}
