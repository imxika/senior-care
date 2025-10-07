import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  DollarSign
} from 'lucide-react'
import Link from 'next/link'
import { formatPrice, formatDate, formatTime, combineDateTime } from '@/lib/utils'
import { BOOKING_STATUS_CONFIG, SERVICE_TYPE_LABELS } from '@/lib/constants'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AdminBookingDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 인증 및 권한 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
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

  // 예약 상세 정보 조회 (Service Role로 RLS 우회)
  const { data: bookingData, error } = await serviceSupabase
    .from('bookings')
    .select(`
      *,
      customer:customers!customer_id(
        id,
        profile:profiles!profile_id(
          full_name,
          email,
          phone
        )
      ),
      trainer:trainers!trainer_id(
        id,
        hourly_rate,
        specialties,
        profile:profiles!profile_id(
          full_name,
          email,
          phone
        )
      )
    `)
    .eq('id', id)
    .maybeSingle()

  const booking = bookingData

  if (error) {
    console.error('Error fetching booking:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
  }

  if (error || !booking) {
    notFound()
  }

  const statusConfig = BOOKING_STATUS_CONFIG[booking.status as keyof typeof BOOKING_STATUS_CONFIG] || BOOKING_STATUS_CONFIG.pending
  const scheduledDateTime = combineDateTime(booking.booking_date, booking.start_time)

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
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">예약 상세</h1>
            <p className="text-muted-foreground mt-1">예약번호: #{booking.id.slice(0, 8)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
            {booking.booking_type === 'recommended' && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                추천 예약
              </Badge>
            )}
            {booking.booking_type === 'direct' && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                지정 예약
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* 고객 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                고객 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow
                icon={<User className="h-4 w-4" />}
                label="이름"
                value={booking.customer?.profile?.full_name || '정보 없음'}
              />
              <InfoRow
                icon={<Mail className="h-4 w-4" />}
                label="이메일"
                value={booking.customer?.profile?.email || '정보 없음'}
              />
              <InfoRow
                icon={<Phone className="h-4 w-4" />}
                label="전화번호"
                value={booking.customer?.profile?.phone || '정보 없음'}
              />
            </CardContent>
          </Card>

          {/* 트레이너 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                트레이너 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {booking.trainer ? (
                <>
                  <InfoRow
                    icon={<User className="h-4 w-4" />}
                    label="이름"
                    value={booking.trainer.profile?.full_name || '정보 없음'}
                  />
                  <InfoRow
                    icon={<Mail className="h-4 w-4" />}
                    label="이메일"
                    value={booking.trainer.profile?.email || '정보 없음'}
                  />
                  <InfoRow
                    icon={<Phone className="h-4 w-4" />}
                    label="전화번호"
                    value={booking.trainer.profile?.phone || '정보 없음'}
                  />
                  <InfoRow
                    icon={<DollarSign className="h-4 w-4" />}
                    label="시급"
                    value={formatPrice(booking.trainer.hourly_rate)}
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {booking.booking_type === 'recommended' ? '매칭 대기 중' : '트레이너 정보 없음'}
                </p>
              )}
              {booking.booking_type === 'recommended' && !booking.trainer_id && (
                <Link href={`/admin/bookings/recommended/${booking.id}/match`}>
                  <Button className="w-full mt-2">
                    트레이너 매칭하기
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* 예약 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                예약 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow
                icon={<Calendar className="h-4 w-4" />}
                label="예약일"
                value={formatDate(scheduledDateTime)}
              />
              <InfoRow
                icon={<Clock className="h-4 w-4" />}
                label="시간"
                value={`${booking.start_time} - ${booking.end_time} (${booking.duration_minutes}분)`}
              />
              <InfoRow
                icon={<FileText className="h-4 w-4" />}
                label="서비스 타입"
                value={SERVICE_TYPE_LABELS[booking.service_type as keyof typeof SERVICE_TYPE_LABELS] || booking.service_type}
              />
              {booking.service_type === 'home_visit' && booking.service_address && (
                <InfoRow
                  icon={<MapPin className="h-4 w-4" />}
                  label="방문 주소"
                  value={booking.service_address}
                />
              )}
            </CardContent>
          </Card>

          {/* 가격 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                가격 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow
                label="기본 금액"
                value={formatPrice(booking.base_price)}
              />
              {booking.price_multiplier && booking.price_multiplier !== 1 && (
                <InfoRow
                  label="가격 배율"
                  value={`×${booking.price_multiplier} (${booking.booking_type === 'direct' ? '지정 예약' : '일반'})`}
                />
              )}
              <Separator />
              <InfoRow
                label="최종 금액"
                value={formatPrice(booking.final_price)}
                className="text-lg font-bold"
              />
            </CardContent>
          </Card>
        </div>

        {/* 추가 정보 */}
        {(booking.customer_notes || booking.specialty_required) && (
          <Card>
            <CardHeader>
              <CardTitle>추가 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {booking.specialty_required && (
                <div>
                  <p className="text-sm font-medium mb-1">필요 전문분야</p>
                  <p className="text-sm text-muted-foreground">{booking.specialty_required}</p>
                </div>
              )}
              {booking.customer_notes && (
                <div>
                  <p className="text-sm font-medium mb-1">고객 요청사항</p>
                  <p className="text-sm text-muted-foreground">{booking.customer_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link href="/admin/bookings">
            <Button variant="outline">목록으로</Button>
          </Link>
        </div>
      </div>
    </>
  )
}

function InfoRow({
  icon,
  label,
  value,
  className
}: {
  icon?: React.ReactNode
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-sm font-medium text-right ${className || ''}`}>
        {value}
      </div>
    </div>
  )
}
