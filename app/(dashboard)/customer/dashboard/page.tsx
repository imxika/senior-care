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
import { calculateAge } from '@/lib/utils'

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

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  // Customer 레코드 처리
  if (!customer) {
    console.log('No customer record found for user:', user.id)
    // customer가 없어도 페이지는 표시되도록 함 (빈 정보로)
    // trigger가 자동으로 생성해줘야 하는데 생성 안된 경우
  }

  const mobilityText =
    customer?.mobility_level === 'independent' ? '독립적' :
    customer?.mobility_level === 'assisted' ? '보조 필요' :
    customer?.mobility_level === 'wheelchair' ? '휠체어 사용' :
    customer?.mobility_level === 'bedridden' ? '와상 상태' : '-'

  // Calculate age from birth_date or use age column
  const customerAge = calculateAge(customer?.birth_date) ?? customer?.age ?? null

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

  // 리뷰 작성 가능한 완료된 예약 조회 (리뷰 없는 것)
  const { data: completedBookingsWithoutReview } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_date,
      trainer:trainers(id)
    `)
    .eq('customer_id', customer?.id)
    .eq('status', 'completed')
    .order('booking_date', { ascending: false })

  // 리뷰가 없는 완료된 예약 찾기
  let bookingForReview = null
  if (completedBookingsWithoutReview && completedBookingsWithoutReview.length > 0) {
    for (const booking of completedBookingsWithoutReview) {
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('booking_id', booking.id)
        .single()

      if (!existingReview) {
        bookingForReview = booking
        break
      }
    }
  }

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
      <div className="flex flex-1 flex-col gap-6 p-6 md:gap-8 md:p-8">
        {/* Page Header - 시니어 친화적 큰 글씨 */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">안녕하세요</h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            {profile?.full_name}님
          </p>
        </div>

        {/* 진행 중인 예약 - 시니어 친화적 */}
        {recentBooking && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <h2 className="text-xl md:text-2xl font-semibold">최근 예약 진행상황</h2>
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

        {/* Quick Actions - 시니어 친화적 큰 버튼 */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:gap-5">
          <Card className="hover:shadow-lg transition-all hover:border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-2">
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900">
                  <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl md:text-2xl">추천 예약</CardTitle>
                  <CardDescription className="text-base md:text-lg mt-1">AI 맞춤 트레이너 매칭</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <Button asChild className="w-full bg-purple-600 hover:bg-purple-700 h-14 text-lg">
                <Link href="/booking/recommended">
                  시작하기
                  <ArrowUpRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all hover:border-primary border-2">
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Search className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl md:text-2xl">트레이너 찾기</CardTitle>
                  <CardDescription className="text-base md:text-lg mt-1">직접 트레이너 선택</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <Button asChild variant="outline" className="w-full h-14 text-lg border-2">
                <Link href="/trainers">
                  검색하기
                  <ArrowUpRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all hover:border-primary border-2">
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900">
                  <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl md:text-2xl">내 예약</CardTitle>
                  <CardDescription className="text-base md:text-lg mt-1">예약 내역 확인</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <Button asChild variant="outline" className="w-full h-14 text-lg border-2">
                <Link href="/customer/bookings">
                  보기
                  <ArrowUpRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all hover:border-primary border-2">
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-900">
                  <Star className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl md:text-2xl">리뷰 작성</CardTitle>
                  <CardDescription className="text-base md:text-lg mt-1">
                    {bookingForReview ? '작성 대기 중' : '내 리뷰 보기'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {bookingForReview ? (
                <Button asChild variant="outline" className="w-full h-14 text-lg border-2">
                  <Link href={`/customer/bookings/${bookingForReview.id}`}>
                    작성하기
                    <ArrowUpRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline" className="w-full h-14 text-lg border-2">
                  <Link href="/customer/reviews">
                    보기
                    <ArrowUpRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profile Info - 시니어 친화적 */}
        <Card className="border-2">
          <CardHeader className="p-6">
            <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
              <User className="h-6 w-6 text-primary" />
              내 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {!customer ? (
              <div className="text-center py-8">
                <p className="text-lg text-muted-foreground mb-4">
                  고객 정보를 불러올 수 없습니다.
                </p>
                <Button asChild variant="outline" className="h-12 text-base">
                  <Link href="/customer/profile">프로필 설정하기</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-lg md:text-xl text-muted-foreground">나이</span>
                  <span className="text-lg md:text-xl font-medium">{customerAge ? `만 ${customerAge}세` : '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center py-2">
                  <span className="text-lg md:text-xl text-muted-foreground">성별</span>
                  <span className="text-lg md:text-xl font-medium">
                    {customer.gender === 'male' ? '남성' : customer.gender === 'female' ? '여성' : customer.gender === 'other' ? '기타' : '-'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center py-2">
                  <span className="text-lg md:text-xl text-muted-foreground">주소</span>
                  <span className="text-lg md:text-xl font-medium text-right">
                    {customer.address || customer.address_detail
                      ? `${customer.address || ''} ${customer.address_detail || ''}`.trim()
                      : '-'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center py-2">
                  <span className="text-lg md:text-xl text-muted-foreground">거동 능력</span>
                  <span className="text-lg md:text-xl font-medium">{mobilityText}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
