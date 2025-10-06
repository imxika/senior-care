import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { User, Calendar, Star, Search, ArrowUpRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { BookingProgressSimple } from '@/components/booking-progress-simple'
import { SERVICE_TYPE_LABELS, type ServiceType } from '@/lib/constants'

export default async function CustomerDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'customer') redirect('/')

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  const mobilityText =
    customer?.mobility_level === 'independent' ? '독립적' :
    customer?.mobility_level === 'assisted' ? '보조 필요' :
    customer?.mobility_level === 'wheelchair' ? '휠체어 사용' :
    customer?.mobility_level === 'bedridden' ? '와상 상태' : '-'

  // 최근 활성 예약 조회
  const { data: recentBookings } = await supabase
    .from('bookings')
    .select(`
      *,
      trainer:trainers(
        id,
        profiles!trainers_profile_id_fkey(full_name)
      )
    `)
    .eq('customer_id', customer?.id)
    .in('status', ['pending', 'confirmed', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)

  const recentBooking = recentBookings?.[0] || null

  const serviceTypeLabel = recentBooking?.service_type
    ? SERVICE_TYPE_LABELS[recentBooking.service_type as ServiceType]
    : undefined

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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">고객 대시보드</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            안녕하세요, {profile?.full_name}님
          </p>
        </div>

        {/* 진행 중인 예약 */}
        {recentBooking && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <h2 className="text-base md:text-lg font-semibold">최근 예약 진행상황</h2>
            </div>
            <BookingProgressSimple
              bookingType={recentBooking.booking_type}
              currentStatus={recentBooking.status}
              hasTrainer={!!recentBooking.trainer_id}
              scheduledDate={(() => {
                const date = new Date(recentBooking.booking_date)
                const month = date.getMonth() + 1
                const day = date.getDate()
                const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
                return `${month}.${day} (${weekday})`
              })()}
              scheduledTime={recentBooking.start_time}
              participantsCount={recentBooking.participants_count || 1}
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 lg:gap-4">
          <Card className="hover:shadow-md transition-all hover:border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
            <CardHeader className="p-4 pb-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base md:text-lg">추천 예약</CardTitle>
                  <CardDescription className="text-xs md:text-sm mt-0.5">AI 맞춤 트레이너 매칭</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Button asChild className="w-full bg-purple-600 hover:bg-purple-700 h-10">
                <Link href="/booking/recommended">
                  시작하기
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all hover:border-primary">
            <CardHeader className="p-4 pb-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base md:text-lg">트레이너 찾기</CardTitle>
                  <CardDescription className="text-xs md:text-sm mt-0.5">직접 트레이너 선택</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Button asChild variant="outline" className="w-full h-10">
                <Link href="/trainers">
                  검색하기
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all hover:border-primary">
            <CardHeader className="p-4 pb-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base md:text-lg">내 예약</CardTitle>
                  <CardDescription className="text-xs md:text-sm mt-0.5">예약 내역 확인</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Button asChild variant="outline" className="w-full h-10">
                <Link href="/customer/bookings">
                  보기
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all hover:border-primary">
            <CardHeader className="p-4 pb-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-yellow-100">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base md:text-lg">리뷰 작성</CardTitle>
                  <CardDescription className="text-xs md:text-sm mt-0.5">서비스 리뷰</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Button variant="outline" className="w-full h-10">
                작성하기
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              내 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">나이</span>
              <span className="font-medium">{customer?.age || '-'}세</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">성별</span>
              <span className="font-medium">
                {customer?.gender === 'male' ? '남성' : customer?.gender === 'female' ? '여성' : '기타'}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">주소</span>
              <span className="font-medium text-right">{customer?.address} {customer?.address_detail}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">거동 능력</span>
              <span className="font-medium">{mobilityText}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
