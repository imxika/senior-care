import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Dumbbell, Calendar, Star, AlertCircle, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

export default async function TrainerDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'trainer') redirect('/')

  const { data: trainer } = await supabase
    .from('trainers')
    .select('*')
    .eq('profile_id', user.id)
    .single()

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
                <BreadcrumbPage>대시보드</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">트레이너 대시보드</h1>
          <p className="text-base text-muted-foreground mt-1">
            안녕하세요, {profile?.full_name}님
          </p>
        </div>

        {/* Approval Alert */}
        {!trainer?.is_verified && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <AlertTitle className="text-base text-yellow-900">승인 대기 중</AlertTitle>
            <AlertDescription className="text-base text-yellow-800">
              관리자 승인 후 서비스를 시작할 수 있습니다. 승인 완료 시 이메일로 알려드립니다.
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-md transition-all hover:border-primary">
            <CardHeader className="p-4 md:p-6 pb-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base md:text-lg">예약 관리</CardTitle>
                  <CardDescription className="text-sm">예약 현황</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <Button asChild variant="outline" className="w-full h-11" disabled={!trainer?.is_verified}>
                <Link href="/trainer/bookings">
                  보기
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all hover:border-primary">
            <CardHeader className="p-4 md:p-6 pb-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-100">
                  <Dumbbell className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base md:text-lg">프로그램 관리</CardTitle>
                  <CardDescription className="text-sm">프로그램 등록</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <Button variant="outline" className="w-full h-11" disabled={!trainer?.is_verified}>
                관리하기
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all hover:border-primary">
            <CardHeader className="p-4 md:p-6 pb-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-yellow-100">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base md:text-lg">리뷰 관리</CardTitle>
                  <CardDescription className="text-sm">고객 리뷰</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <Button variant="outline" className="w-full h-11" disabled={!trainer?.is_verified}>
                보기
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Dumbbell className="h-5 w-5 text-primary" />
              내 프로필
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex justify-between items-center">
              <span className="text-base text-muted-foreground">경력</span>
              <span className="text-base font-medium">{trainer?.experience_years || 0}년</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-base text-muted-foreground">평점</span>
              <span className="text-base font-medium">⭐ {trainer?.rating?.toFixed(1) || '0.0'} ({trainer?.total_reviews || 0}개 리뷰)</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-base text-muted-foreground">상태</span>
              <span className={`text-base font-medium ${trainer?.is_verified ? 'text-green-600' : 'text-yellow-600'}`}>
                {trainer?.is_verified ? '승인 완료' : '승인 대기'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
