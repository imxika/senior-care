import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, Clock, Filter, Download, Search, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export default async function AdminBookingsPage() {
  const supabase = await createClient()

  // 인증 및 권한 확인
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

  // 모든 예약 목록 가져오기 (고객 및 트레이너 정보 포함)
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:profiles!bookings_customer_id_fkey(
        id,
        full_name,
        email
      ),
      trainer:trainers(
        id,
        name,
        specialization
      )
    `)
    .order('scheduled_at', { ascending: false })

  if (error) {
    console.error('Error fetching bookings:', error)
  }

  // 통계 계산
  const stats = {
    total: bookings?.length || 0,
    pending: bookings?.filter(b => b.status === 'pending').length || 0,
    confirmed: bookings?.filter(b => b.status === 'confirmed').length || 0,
    completed: bookings?.filter(b => b.status === 'completed').length || 0,
    cancelled: bookings?.filter(b => b.status === 'cancelled').length || 0,
    todayBookings: bookings?.filter(b => {
      const today = new Date()
      const bookingDate = new Date(b.scheduled_at)
      return bookingDate.toDateString() === today.toDateString()
    }).length || 0,
  }

  // 상태별 분류
  const pendingBookings = bookings?.filter(b => b.status === 'pending') || []
  const confirmedBookings = bookings?.filter(b => b.status === 'confirmed') || []
  const recentBookings = bookings?.slice(0, 10) || []

  return (
    <>
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/admin/dashboard">관리자</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>예약 관리</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">예약 관리</h1>
            <p className="text-muted-foreground mt-1">전체 예약 현황 및 관리</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              필터
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              내보내기
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <StatCard title="전체 예약" count={stats.total} />
          <StatCard title="오늘 예약" count={stats.todayBookings} icon="purple" />
          <StatCard title="승인 대기" count={stats.pending} icon="yellow" />
          <StatCard title="확정" count={stats.confirmed} icon="blue" />
          <StatCard title="완료" count={stats.completed} icon="green" />
          <StatCard title="취소" count={stats.cancelled} icon="red" />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="고객명, 트레이너명, 예약번호로 검색..." className="pl-10" />
        </div>

        {/* Pending Bookings */}
        {pendingBookings.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <h2 className="text-lg font-semibold">승인 대기 중 ({pendingBookings.length})</h2>
            </div>
            <div className="grid gap-4">
              {pendingBookings.map(booking => (
                <AdminBookingCard key={booking.id} booking={booking} priority />
              ))}
            </div>
          </div>
        )}

        {/* Confirmed Bookings */}
        {confirmedBookings.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold">확정된 예약 ({confirmedBookings.length})</h2>
            </div>
            <div className="grid gap-4">
              {confirmedBookings.slice(0, 5).map(booking => (
                <AdminBookingCard key={booking.id} booking={booking} />
              ))}
            </div>
            {confirmedBookings.length > 5 && (
              <Button variant="ghost" className="w-full">
                더 보기 ({confirmedBookings.length - 5}개)
              </Button>
            )}
          </div>
        )}

        {/* Recent Bookings Table */}
        <Card>
          <CardHeader>
            <CardTitle>최근 예약</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium">예약번호</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">고객</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">예약일시</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">상태</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentBookings.map(booking => (
                    <BookingTableRow key={booking.id} booking={booking} />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function StatCard({ title, count, icon }: { title: string; count: number; icon?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm font-medium text-muted-foreground">{title}</div>
        <div className="text-2xl font-bold mt-2">{count}</div>
      </CardContent>
    </Card>
  )
}

function AdminBookingCard({ booking, priority = false }: { booking: any; priority?: boolean }) {
  const scheduledDate = new Date(booking.scheduled_at)

  return (
    <Card className={priority ? 'border-yellow-400' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">#{booking.id.slice(0, 8)}</span>
              {priority && <Badge variant="outline" className="border-yellow-400 text-yellow-600">승인 필요</Badge>}
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">고객</div>
                <div className="font-medium">{booking.customer?.full_name || '정보 없음'}</div>
                <div className="text-muted-foreground">{booking.customer?.email}</div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">트레이너</div>
                <div className="font-medium">{booking.trainer?.name || '정보 없음'}</div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">예약 일시</div>
                <div className="font-medium">
                  {scheduledDate.toLocaleDateString('ko-KR')} {scheduledDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>

          {priority && (
            <div className="flex gap-2">
              <Button size="sm">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                승인
              </Button>
              <Button size="sm" variant="outline">
                <XCircle className="h-4 w-4 mr-1" />
                거절
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function BookingTableRow({ booking }: { booking: any }) {
  const statusConfig = {
    pending: { label: '대기', variant: 'secondary' as const },
    confirmed: { label: '확정', variant: 'default' as const },
    completed: { label: '완료', variant: 'outline' as const },
    cancelled: { label: '취소', variant: 'destructive' as const },
  }

  const config = statusConfig[booking.status as keyof typeof statusConfig]
  const scheduledDate = new Date(booking.scheduled_at)

  return (
    <tr className="hover:bg-muted/50">
      <td className="px-4 py-3 text-sm">#{booking.id.slice(0, 8)}</td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium">{booking.customer?.full_name || '정보 없음'}</div>
        <div className="text-xs text-muted-foreground">{booking.customer?.email}</div>
      </td>
      <td className="px-4 py-3 text-sm">
        {scheduledDate.toLocaleDateString('ko-KR')} {scheduledDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
      </td>
      <td className="px-4 py-3">
        <Badge variant={config?.variant}>{config?.label}</Badge>
      </td>
      <td className="px-4 py-3">
        <Button variant="ghost" size="sm">상세보기</Button>
      </td>
    </tr>
  )
}
