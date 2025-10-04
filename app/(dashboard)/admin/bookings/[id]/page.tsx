import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { Calendar, Clock, MapPin, User, Phone, Mail, Home, Building } from 'lucide-react'

interface PageProps {
  params: { id: string }
}

export default async function BookingDetailPage({ params }: PageProps) {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 관리자 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'admin') {
    redirect('/')
  }

  // 예약 정보 가져오기
  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:profiles!bookings_customer_id_fkey(
        id,
        full_name,
        email,
        phone,
        avatar_url
      ),
      trainer:trainers(
        id,
        hourly_rate,
        profiles!trainers_profile_id_fkey(
          full_name,
          email,
          phone,
          avatar_url
        )
      )
    `)
    .eq('id', params.id)
    .single()

  if (error || !booking) {
    notFound()
  }

  const scheduledDate = new Date(booking.scheduled_at)
  const createdDate = new Date(booking.created_at)

  const statusConfig = {
    pending: { label: '승인 대기', variant: 'secondary' as const },
    confirmed: { label: '확정됨', variant: 'default' as const },
    completed: { label: '완료됨', variant: 'outline' as const },
    cancelled: { label: '취소됨', variant: 'destructive' as const },
    rejected: { label: '거절됨', variant: 'destructive' as const },
    no_show: { label: '노쇼', variant: 'destructive' as const },
  }

  const status = statusConfig[booking.status as keyof typeof statusConfig] || statusConfig.pending

  return (
    <>
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
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/admin/bookings">예약 관리</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>예약 상세</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">예약 상세 정보</h1>
            <p className="text-muted-foreground mt-1">예약 ID: {booking.id}</p>
          </div>
          <Badge variant={status.variant} className="text-lg px-4 py-2">
            {status.label}
          </Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* 왼쪽: 예약 정보 */}
          <div className="md:col-span-2 space-y-6">
            {/* 일정 정보 */}
            <Card>
              <CardHeader>
                <CardTitle>예약 일정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-semibold">
                      {scheduledDate.toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long',
                      })}
                    </div>
                    <div className="text-sm text-muted-foreground">예약 날짜</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-semibold">
                      {scheduledDate.toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} • {booking.duration_minutes}분
                    </div>
                    <div className="text-sm text-muted-foreground">예약 시간 및 기간</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {booking.service_type === 'home' ? (
                    <Home className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Building className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <div className="font-semibold">
                      {booking.service_type === 'home' ? '방문 서비스' : '센터 방문'}
                    </div>
                    <div className="text-sm text-muted-foreground">서비스 유형</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 고객 메모 */}
            {booking.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>고객 요청사항</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{booking.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* 예약 히스토리 */}
            <Card>
              <CardHeader>
                <CardTitle>예약 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">예약 생성</span>
                  <span className="font-medium">
                    {createdDate.toLocaleString('ko-KR')}
                  </span>
                </div>
                {booking.updated_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">마지막 업데이트</span>
                    <span className="font-medium">
                      {new Date(booking.updated_at).toLocaleString('ko-KR')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 오른쪽: 고객 & 트레이너 정보 */}
          <div className="space-y-6">
            {/* 고객 정보 */}
            <Card>
              <CardHeader>
                <CardTitle>고객 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={booking.customer?.avatar_url} />
                    <AvatarFallback>
                      {booking.customer?.full_name?.charAt(0) || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{booking.customer?.full_name}</div>
                    <div className="text-sm text-muted-foreground">고객</div>
                  </div>
                </div>

                <Separator />

                {booking.customer?.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{booking.customer.email}</span>
                  </div>
                )}

                {booking.customer?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{booking.customer.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 트레이너 정보 */}
            <Card>
              <CardHeader>
                <CardTitle>트레이너 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={booking.trainer?.profiles?.avatar_url} />
                    <AvatarFallback>
                      {booking.trainer?.profiles?.full_name?.charAt(0) || 'T'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{booking.trainer?.profiles?.full_name}</div>
                    <div className="text-sm text-muted-foreground">트레이너</div>
                  </div>
                </div>

                <Separator />

                {booking.trainer?.profiles?.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{booking.trainer.profiles.email}</span>
                  </div>
                )}

                {booking.trainer?.profiles?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{booking.trainer.profiles.phone}</span>
                  </div>
                )}

                {booking.trainer?.hourly_rate && (
                  <div className="pt-2 border-t">
                    <div className="text-sm text-muted-foreground">시간당 요금</div>
                    <div className="text-lg font-bold">
                      {booking.trainer.hourly_rate.toLocaleString()}원
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
