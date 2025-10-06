import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DollarSign, TrendingUp, Calendar, Download, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PageProps {
  searchParams: Promise<{
    month?: string
    year?: string
  }>
}

export default async function TrainerEarningsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 트레이너 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'trainer') {
    redirect('/')
  }

  // 트레이너 정보 가져오기
  const { data: trainerInfo } = await supabase
    .from('trainers')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  if (!trainerInfo) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          <Alert variant="destructive">
            <AlertDescription>트레이너 정보를 찾을 수 없습니다.</AlertDescription>
          </Alert>
        </div>
      </>
    )
  }

  // 현재 날짜 기준
  const now = new Date()
  const currentYear = parseInt(params.year || now.getFullYear().toString())
  const currentMonth = parseInt(params.month || (now.getMonth() + 1).toString())

  // 완료된 예약 가져오기
  const { data: completedBookings } = await supabase
    .from('bookings')
    .select(`
      *,
      customers!bookings_customer_id_fkey(
        id,
        profiles!customers_profile_id_fkey(
          full_name,
          email
        )
      )
    `)
    .eq('trainer_id', trainerInfo.id)
    .eq('status', 'completed')
    .order('booking_date', { ascending: false })

  // 데이터 구조 변환
  interface CompletedBooking {
    id: string
    booking_date: string
    start_time: string
    end_time: string
    price?: number
    booking_type?: string
    customers?: {
      id: string
      profiles?: {
        full_name?: string
        email?: string
      }
    }
    customer?: {
      id: string
      profiles?: {
        full_name?: string
        email?: string
      }
    }
  }

  const bookings = completedBookings?.map((booking: CompletedBooking) => ({
    ...booking,
    customer: booking.customers
  })) || []

  // 이번 달 수입 계산
  const thisMonthEarnings = bookings
    .filter(b => {
      const date = new Date(b.booking_date)
      return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear
    })
    .reduce((sum, b) => sum + (b.price || trainerInfo.hourly_rate || 80000), 0)

  // 이번 주 수입 계산
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const thisWeekEarnings = bookings
    .filter(b => {
      const date = new Date(b.booking_date)
      return date >= weekStart
    })
    .reduce((sum, b) => sum + (b.price || trainerInfo.hourly_rate || 80000), 0)

  // 총 수입 계산
  const totalEarnings = bookings.reduce((sum, b) => sum + (b.price || trainerInfo.hourly_rate || 80000), 0)

  // 이번 달 세션 수
  const thisMonthSessions = bookings.filter(b => {
    const date = new Date(b.booking_date)
    return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear
  }).length

  // 월별 수입 데이터 (최근 6개월)
  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const year = date.getFullYear()
    const month = date.getMonth() + 1

    const earnings = bookings
      .filter(b => {
        const bookingDate = new Date(b.booking_date)
        return bookingDate.getMonth() + 1 === month && bookingDate.getFullYear() === year
      })
      .reduce((sum, b) => sum + (b.price || trainerInfo.hourly_rate || 80000), 0)

    const sessions = bookings.filter(b => {
      const bookingDate = new Date(b.booking_date)
      return bookingDate.getMonth() + 1 === month && bookingDate.getFullYear() === year
    }).length

    monthlyData.push({
      year,
      month,
      monthLabel: `${year}년 ${month}월`,
      earnings,
      sessions,
    })
  }

  // 최근 수입 내역 (이번 달)
  const recentEarnings = bookings
    .filter(b => {
      const date = new Date(b.booking_date)
      return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear
    })
    .slice(0, 10)

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/trainer/dashboard">트레이너</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>수입 관리</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">수입 관리</h1>
            <p className="text-muted-foreground mt-1">수입 현황과 통계를 확인하세요</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              엑셀 다운로드
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              세금계산서
            </Button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">이번 달 수입</p>
                  <p className="text-2xl font-bold mt-2">{thisMonthEarnings.toLocaleString()}원</p>
                  <p className="text-xs text-muted-foreground mt-1">{thisMonthSessions}회 세션</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">이번 주 수입</p>
                  <p className="text-2xl font-bold mt-2">{thisWeekEarnings.toLocaleString()}원</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">총 수입</p>
                  <p className="text-2xl font-bold mt-2">{totalEarnings.toLocaleString()}원</p>
                  <p className="text-xs text-muted-foreground mt-1">{bookings.length}회 세션</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">시간당 기본요금</p>
                  <p className="text-2xl font-bold mt-2">{(trainerInfo.hourly_rate || 80000).toLocaleString()}원</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 월별 수입 추이 */}
        <Card>
          <CardHeader>
            <CardTitle>월별 수입 추이</CardTitle>
            <CardDescription>최근 6개월간의 수입 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyData.map((data) => (
                <div key={`${data.year}-${data.month}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{data.monthLabel}</p>
                      <p className="text-sm text-muted-foreground">{data.sessions}회 세션</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{data.earnings.toLocaleString()}원</p>
                    {data.sessions > 0 && (
                      <p className="text-xs text-muted-foreground">
                        회당 평균: {Math.round(data.earnings / data.sessions).toLocaleString()}원
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 최근 수입 내역 */}
        <Card>
          <CardHeader>
            <CardTitle>이번 달 수입 내역 ({recentEarnings.length}건)</CardTitle>
            <CardDescription>{currentYear}년 {currentMonth}월의 완료된 세션</CardDescription>
          </CardHeader>
          <CardContent>
            {recentEarnings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                이번 달 완료된 세션이 없습니다
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-semibold">날짜</th>
                      <th className="text-left p-3 font-semibold">시간</th>
                      <th className="text-left p-3 font-semibold">고객명</th>
                      <th className="text-left p-3 font-semibold">타입</th>
                      <th className="text-right p-3 font-semibold">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEarnings.map((booking) => (
                      <tr key={booking.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          {new Date(booking.booking_date).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {booking.start_time} - {booking.end_time}
                        </td>
                        <td className="p-3">
                          <div className="font-medium">
                            {booking.customer?.profiles?.full_name || '고객 정보 없음'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {booking.customer?.profiles?.email}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">
                            {booking.booking_type === 'direct' ? '지정' : '추천'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-semibold text-lg">
                            {(booking.price || trainerInfo.hourly_rate || 80000).toLocaleString()}원
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/30">
                      <td colSpan={4} className="p-3 text-right font-semibold">
                        합계
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-xl font-bold text-primary">
                          {thisMonthEarnings.toLocaleString()}원
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
