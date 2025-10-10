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
  DollarSign,
  CreditCard,
  Bell
} from 'lucide-react'
import Link from 'next/link'
import { formatPrice, formatDate, combineDateTime } from '@/lib/utils'
import { BOOKING_STATUS_CONFIG, SERVICE_TYPE_LABELS } from '@/lib/constants'
import { RefundPaymentDialog } from '@/components/admin/refund-payment-dialog'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

interface Payment {
  id: string
  payment_status: 'paid' | 'pending' | 'refunded' | 'failed'
  total_amount: number
  amount: number
  payment_method: string
  payment_provider: 'stripe' | 'toss'
  payment_metadata?: Record<string, unknown> | null
  paid_at?: string | null
  created_at: string
}

interface TrainerNotification {
  id: string
  title: string
  message: string
  created_at: string
  is_read: boolean
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
      ),
      payments!booking_id(
        id,
        amount,
        currency,
        payment_method,
        payment_status,
        payment_provider,
        paid_at,
        created_at,
        payment_metadata
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

  // Trainer에게 전송된 알림 조회
  const trainerData = booking?.trainer && typeof booking.trainer === 'object'
    ? (Array.isArray(booking.trainer) ? booking.trainer[0] : booking.trainer)
    : null
  const trainerProfile = trainerData && typeof trainerData === 'object' && 'profile' in trainerData
    ? (Array.isArray(trainerData.profile) ? trainerData.profile[0] : trainerData.profile)
    : null
  const trainerProfileId = trainerProfile && typeof trainerProfile === 'object' && 'id' in trainerProfile
    ? trainerProfile.id
    : null

  const { data: trainerNotifications } = trainerProfileId
    ? await serviceSupabase
        .from('notifications')
        .select('*')
        .eq('user_id', trainerProfileId)
        .or(`link.cs.{/bookings/${id}},link.cs.{/trainer/bookings/${id}}`)
        .order('created_at', { ascending: false })
    : { data: null }

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

        {/* 결제 정보 - Admin용 (모든 결제 상태 표시) */}
        {booking.total_price > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                💳 결제 정보 (관리자)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 총 예약 금액 */}
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-muted-foreground">총 예약 금액</span>
                <span className="text-lg font-bold">{booking.total_price.toLocaleString()}원</span>
              </div>

              {/* 결제 상세 내역 */}
              {booking.payments && booking.payments.length > 0 ? (
                <div className="space-y-3 mt-3">
                  <p className="text-sm font-medium text-muted-foreground">결제 내역</p>
                  {booking.payments.map((payment: Payment) => {
                    const statusBadge =
                      payment.payment_status === 'paid' ? { label: '✅ 결제 완료', variant: 'default' as const } :
                      payment.payment_status === 'pending' ? { label: '⏳ 결제 대기', variant: 'secondary' as const } :
                      payment.payment_status === 'refunded' ? { label: '🔄 환불 완료', variant: 'outline' as const } :
                      payment.payment_status === 'failed' ? { label: '❌ 결제 실패', variant: 'destructive' as const } :
                      { label: '⚠️ 알 수 없음', variant: 'secondary' as const };

                    const providerLabel = payment.payment_provider === 'stripe' ? 'Stripe' : 'Toss Payments';

                    return (
                      <div key={payment.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                          <span className="text-xs text-muted-foreground">{providerLabel}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">금액:</span>
                            <span className="ml-1 font-medium">{typeof payment.amount === 'number' ? payment.amount.toLocaleString() : parseFloat(String(payment.amount)).toLocaleString()}원</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">결제수단:</span>
                            <span className="ml-1 font-medium">{payment.payment_method}</span>
                          </div>
                        </div>

                        {payment.paid_at && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">결제일시:</span>
                            <span className="ml-1">{new Date(payment.paid_at).toLocaleString('ko-KR')}</span>
                          </div>
                        )}

                        {payment.payment_status === 'refunded' && payment.payment_metadata && typeof payment.payment_metadata === 'object' && 'refund' in payment.payment_metadata && (
                          <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                            <p className="font-medium text-yellow-800">환불 정보</p>
                            {typeof payment.payment_metadata.refund === 'object' && payment.payment_metadata.refund && (
                              <>
                                {'reason' in payment.payment_metadata.refund && (
                                  <p className="text-yellow-700 mt-1">
                                    사유: {String(payment.payment_metadata.refund.reason || '정보 없음')}
                                  </p>
                                )}
                                {'refundedAt' in payment.payment_metadata.refund && payment.payment_metadata.refund.refundedAt && (
                                  <p className="text-yellow-700">
                                    환불일시: {new Date(String(payment.payment_metadata.refund.refundedAt)).toLocaleString('ko-KR')}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t">
                          <div className="text-xs text-muted-foreground">
                            결제 ID: {payment.id}
                          </div>
                          {payment.payment_status === 'paid' && (
                            <RefundPaymentDialog
                              paymentId={payment.id}
                              amount={String(payment.amount)}
                              provider={payment.payment_provider}
                              bookingDate={booking.booking_date}
                              startTime={booking.start_time}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                  <p className="text-sm text-yellow-800 font-medium">⚠️ 결제 대기 중</p>
                  <p className="text-xs text-yellow-700 mt-1">고객이 아직 결제를 완료하지 않았습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 트레이너 알림 전송 확인 (Admin) */}
        {booking.trainer && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                🔔 트레이너 알림 전송 내역
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {trainerNotifications && trainerNotifications.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    총 {trainerNotifications.length}건의 알림이 전송되었습니다.
                  </p>
                  <div className="space-y-2">
                    {trainerNotifications.map((notification: TrainerNotification) => (
                      <div key={notification.id} className="bg-gray-50 rounded-lg p-3 border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                            <div className="flex gap-2 items-center mt-2">
                              <span className="text-xs text-muted-foreground">
                                {new Date(notification.created_at).toLocaleString('ko-KR')}
                              </span>
                              {notification.is_read ? (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">✓ 읽음</span>
                              ) : (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">미읽음</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 font-medium">⚠️ 알림 전송 내역 없음</p>
                  <p className="text-xs text-yellow-700 mt-1">아직 트레이너에게 전송된 알림이 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
