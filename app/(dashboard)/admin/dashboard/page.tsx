import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Users, UserCheck, Clock, Calendar, ExternalLink, AlertCircle, ArrowUpRight, Activity, UserCog } from 'lucide-react'
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

  // 통계 데이터 가져오기
  const { count: totalTrainers } = await supabase
    .from('trainers')
    .select('*', { count: 'exact', head: true })

  const { count: pendingTrainers } = await supabase
    .from('trainers')
    .select('*', { count: 'exact', head: true })
    .eq('is_verified', false)

  const { count: activeTrainers } = await supabase
    .from('trainers')
    .select('*', { count: 'exact', head: true })
    .eq('is_verified', true)
    .eq('is_active', true)

  const { count: totalCustomers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('user_type', 'customer')

  // 추천 예약 매칭 대기 수
  const { count: pendingRecommendedBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('booking_type', 'recommended')
    .eq('status', 'pending')
    .is('trainer_id', null)

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
                <Link href="/admin/bookings/recommended" className="ml-2 font-medium underline underline-offset-4 hover:text-green-900">
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

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">전체 트레이너</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalTrainers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                등록된 트레이너
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">승인 대기</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingTrainers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                검토가 필요합니다
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">활동 중</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                <UserCheck className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeTrainers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                활성 트레이너
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">고객 수</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalCustomers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                등록된 고객
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-md transition-all hover:border-primary">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">트레이너 관리</CardTitle>
                  <CardDescription className="text-xs">승인 및 Sanity 게시</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/admin/trainers">
                  바로가기
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all hover:border-primary">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
                  <ExternalLink className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">Sanity Studio</CardTitle>
                  <CardDescription className="text-xs">CMS 관리</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <a href="http://localhost:3333/senior-care" target="_blank" rel="noopener noreferrer">
                  열기
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all hover:border-primary">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
                  <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">예약 관리</CardTitle>
                  <CardDescription className="text-xs">예약 현황 확인</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/admin/bookings">
                  바로가기
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all hover:border-green-500">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
                  <UserCog className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">추천 예약 매칭</CardTitle>
                  <CardDescription className="text-xs">
                    {pendingRecommendedBookings ? `${pendingRecommendedBookings}건 대기 중` : '대기 없음'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/admin/bookings/recommended">
                  바로가기
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
