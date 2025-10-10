import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Calendar,
  MapPin
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import Link from 'next/link'
import { CancelBookingButton } from './actions-ui'

// 타입 정의
interface BookingCustomer {
  profile?: {
    full_name?: string
  }
}

interface BookingTrainer {
  profile?: {
    full_name?: string
  }
}

export default async function AutoMatchingMonitorPage() {
  const supabase = await createClient()

  // 1. 현재 자동 매칭 진행 중인 예약 (pending)
  const { data: pendingBookings } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_date,
      start_time,
      duration_minutes,
      service_type,
      session_type,
      notified_at,
      auto_match_deadline,
      pending_trainer_ids,
      fallback_to_admin,
      customer:customers!bookings_customer_id_fkey(
        id,
        profile:profiles!customers_profile_id_fkey(
          full_name
        )
      )
    `)
    .eq('booking_type', 'recommended')
    .eq('matching_status', 'pending')
    .is('trainer_id', null)
    .eq('fallback_to_admin', false)
    .neq('status', 'cancelled')
    .order('notified_at', { ascending: false })

  // 2. Admin 개입 필요 (타임아웃된 예약)
  const { data: timedOutBookings } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_date,
      start_time,
      duration_minutes,
      service_type,
      session_type,
      notified_at,
      auto_match_deadline,
      admin_notified_at,
      pending_trainer_ids,
      customer:customers!bookings_customer_id_fkey(
        id,
        profile:profiles!customers_profile_id_fkey(
          full_name
        )
      )
    `)
    .eq('booking_type', 'recommended')
    .eq('matching_status', 'pending')
    .is('trainer_id', null)
    .eq('fallback_to_admin', true)
    .neq('status', 'cancelled')
    .order('admin_notified_at', { ascending: false })

  // 3. 최근 자동 매칭 성공한 예약 (지난 24시간)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentMatched } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_date,
      start_time,
      duration_minutes,
      service_type,
      trainer_confirmed_at,
      customer:customers!bookings_customer_id_fkey(
        profile:profiles!customers_profile_id_fkey(full_name)
      ),
      trainer:trainers!bookings_trainer_id_fkey(
        profile:profiles!trainers_profile_id_fkey(full_name)
      )
    `)
    .eq('booking_type', 'recommended')
    .eq('matching_status', 'approved')
    .gte('trainer_confirmed_at', yesterday)
    .order('trainer_confirmed_at', { ascending: false })
    .limit(10)

  // 4. 통계 데이터
  const { data: stats } = await supabase
    .from('bookings')
    .select('id, matching_status, fallback_to_admin')
    .eq('booking_type', 'recommended')
    .gte('created_at', yesterday)

  const totalRequests = stats?.length || 0
  const autoMatchedCount = stats?.filter(s => s.matching_status === 'approved').length || 0
  const adminInterventionCount = stats?.filter(s => s.fallback_to_admin).length || 0
  const successRate = totalRequests > 0 ? Math.round((autoMatchedCount / totalRequests) * 100) : 0

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">자동 매칭 모니터링</h1>
        <p className="text-gray-600 mt-2">추천 예약 자동 매칭 시스템 현황</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24시간 총 요청</CardTitle>
            <Calendar className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests}건</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">자동 매칭 성공</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{autoMatchedCount}건</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin 개입 필요</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{adminInterventionCount}건</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">성공률</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{successRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Admin 개입 필요 (타임아웃) */}
      {timedOutBookings && timedOutBookings.length > 0 && (
        <Alert variant="destructive" className="border-orange-300 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>{timedOutBookings.length}건</strong>의 예약이 30분 내에 매칭되지 않아 수동 매칭이 필요합니다.
          </AlertDescription>
        </Alert>
      )}

      {/* 타임아웃된 예약 목록 */}
      {timedOutBookings && timedOutBookings.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Admin 개입 필요 ({timedOutBookings.length}건)
          </h2>

          {timedOutBookings.map((booking) => {
            const customerName = (booking.customer as BookingCustomer)?.profile?.full_name || '고객'
            const deadline = new Date(booking.auto_match_deadline)
            const notifiedAt = new Date(booking.notified_at)
            const adminNotifiedAt = booking.admin_notified_at ? new Date(booking.admin_notified_at) : null

            return (
              <Card key={booking.id} className="border-orange-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {customerName}님의 예약
                        <Badge variant="destructive">수동 매칭 필요</Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        예약 ID: {booking.id.slice(0, 8)}...
                      </p>
                    </div>
                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                      {booking.pending_trainer_ids?.length || 0}명 알림
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{booking.booking_date} {booking.start_time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>{booking.duration_minutes}분 ({booking.session_type})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{booking.service_type === 'home_visit' ? '방문' : '센터'}</span>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-3 rounded-lg space-y-1">
                    <p className="text-sm font-medium text-orange-800">타임아웃 정보</p>
                    <p className="text-xs text-orange-600">
                      알림 발송: {formatDistanceToNow(notifiedAt, { addSuffix: true, locale: ko })}
                    </p>
                    <p className="text-xs text-orange-600">
                      마감 시간: {formatDistanceToNow(deadline, { addSuffix: true, locale: ko })}
                    </p>
                    {adminNotifiedAt && (
                      <p className="text-xs text-orange-600">
                        Admin 알림: {formatDistanceToNow(adminNotifiedAt, { addSuffix: true, locale: ko })}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/admin/bookings/recommended/${booking.id}/match`} className="flex-1">
                      <Button className="w-full" variant="default">
                        수동 매칭하기
                      </Button>
                    </Link>
                    <CancelBookingButton bookingId={booking.id} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 진행 중인 자동 매칭 */}
      {pendingBookings && pendingBookings.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            자동 매칭 진행 중 ({pendingBookings.length}건)
          </h2>

          {pendingBookings.map((booking) => {
            const customerName = (booking.customer as BookingCustomer)?.profile?.full_name || '고객'

            // NULL 체크 및 기본값 처리
            const hasValidDates = booking.notified_at && booking.auto_match_deadline
            const deadline = hasValidDates ? new Date(booking.auto_match_deadline) : null
            const notifiedAt = hasValidDates ? new Date(booking.notified_at) : null
            const timeLeft = deadline ? deadline.getTime() - Date.now() : 0
            const minutesLeft = Math.floor(timeLeft / 60000)

            return (
              <Card key={booking.id} className="border-blue-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {customerName}님의 예약
                        <Badge variant="outline" className="text-blue-600 border-blue-300">
                          {hasValidDates ? '매칭 대기 중' : 'Admin 확인 필요'}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        예약 ID: {booking.id.slice(0, 8)}...
                      </p>
                    </div>
                    <Badge variant="outline">
                      {booking.pending_trainer_ids?.length || 0}명 알림
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{booking.booking_date} {booking.start_time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>{booking.duration_minutes}분 ({booking.session_type})</span>
                    </div>
                  </div>

                  {hasValidDates ? (
                    <div className={`p-3 rounded-lg space-y-1 ${
                      minutesLeft <= 5 ? 'bg-orange-50' : 'bg-blue-50'
                    }`}>
                      <p className={`text-sm font-medium ${
                        minutesLeft <= 5 ? 'text-orange-800' : 'text-blue-800'
                      }`}>
                        자동 매칭 진행 중
                      </p>
                      <p className={`text-xs ${
                        minutesLeft <= 5 ? 'text-orange-600' : 'text-blue-600'
                      }`}>
                        알림 발송: {formatDistanceToNow(notifiedAt!, { addSuffix: true, locale: ko })}
                      </p>
                      <p className={`text-xs font-medium ${
                        minutesLeft <= 5 ? 'text-orange-600' : 'text-blue-600'
                      }`}>
                        남은 시간: 약 {minutesLeft}분
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg space-y-1 bg-yellow-50">
                      <p className="text-sm font-medium text-yellow-800">
                        자동 매칭 미실행
                      </p>
                      <p className="text-xs text-yellow-600">
                        이 예약은 자동 매칭 시스템 도입 전에 생성되었습니다.
                      </p>
                      <p className="text-xs text-yellow-600">
                        수동으로 트레이너를 매칭해주세요.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link href={`/admin/bookings/${booking.id}`} className="flex-1">
                      <Button className="w-full" variant="outline">
                        예약 상세 보기
                      </Button>
                    </Link>
                    <Link href={`/admin/bookings/recommended/${booking.id}/match`}>
                      <Button variant="secondary">
                        수동 매칭
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 최근 자동 매칭 성공 */}
      {recentMatched && recentMatched.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            최근 자동 매칭 성공 ({recentMatched.length}건)
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            {recentMatched.map((booking) => {
              const customerName = (booking.customer as BookingCustomer)?.profile?.full_name || '고객'
              const trainerName = (booking.trainer as BookingTrainer)?.profile?.full_name || '트레이너'
              const confirmedAt = new Date(booking.trainer_confirmed_at)

              return (
                <Card key={booking.id} className="border-green-300 bg-green-50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{customerName}님</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          트레이너: {trainerName}
                        </p>
                      </div>
                      <Badge className="bg-green-500">매칭 완료</Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>{booking.booking_date} {booking.start_time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-green-700">
                          {formatDistanceToNow(confirmedAt, { addSuffix: true, locale: ko })} 승인
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {(!pendingBookings || pendingBookings.length === 0) &&
       (!timedOutBookings || timedOutBookings.length === 0) &&
       (!recentMatched || recentMatched.length === 0) && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            현재 자동 매칭 진행 중인 예약이 없습니다.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
