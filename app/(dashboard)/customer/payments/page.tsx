import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CreditCard, Download, Eye } from 'lucide-react'
import Link from 'next/link'

export default async function CustomerPaymentsPage() {
  const supabase = await createClient()

  // 1. Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/signin')
  }

  // 2. Get customer record
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!customer) {
    redirect('/customer/dashboard')
  }

  // 3. Get all payments for this customer
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select(`
      id,
      booking_id,
      amount,
      currency,
      payment_method,
      payment_status,
      payment_provider,
      paid_at,
      created_at,
      payment_metadata,
      booking:bookings(
        id,
        booking_date,
        start_time,
        service_type,
        trainer:trainers(
          id,
          profiles!trainers_profile_id_fkey(
            full_name
          )
        )
      )
    `)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError)
  }

  const paymentsList = payments || []

  // Calculate statistics
  const totalPaid = paymentsList
    .filter(p => p.payment_status === 'paid')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0)

  const paidCount = paymentsList.filter(p => p.payment_status === 'paid').length
  const pendingCount = paymentsList.filter(p => p.payment_status === 'pending').length
  const failedCount = paymentsList.filter(p => p.payment_status === 'failed').length

  // Helper functions
  const getPaymentStatusBadge = (status: string) => {
    const variants = {
      paid: { label: '✅ 결제 완료', variant: 'default' as const, color: 'text-green-600' },
      pending: { label: '⏳ 결제 대기', variant: 'secondary' as const, color: 'text-yellow-600' },
      failed: { label: '❌ 결제 실패', variant: 'destructive' as const, color: 'text-red-600' },
      cancelled: { label: '🚫 취소', variant: 'outline' as const, color: 'text-gray-600' },
    }
    return variants[status as keyof typeof variants] || { label: status, variant: 'outline' as const, color: 'text-gray-600' }
  }

  const getProviderLabel = (provider: string) => {
    return provider === 'stripe' ? '💵 Stripe' : '💳 Toss Payments'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const getTrainerName = (booking: any) => {
    const trainer = Array.isArray(booking?.trainer) ? booking.trainer[0] : null
    const profile = Array.isArray(trainer?.profiles) ? trainer.profiles[0] : null
    return profile?.full_name || '트레이너'
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-xl font-semibold">💳 결제 내역</h1>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground">총 결제 금액</div>
            <div className="text-2xl font-bold">{totalPaid.toLocaleString('ko-KR')}원</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground">완료</div>
            <div className="text-2xl font-bold text-green-600">{paidCount}건</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground">대기중</div>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}건</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground">실패</div>
            <div className="text-2xl font-bold text-red-600">{failedCount}건</div>
          </div>
        </div>

        {/* Payments List */}
        <div className="rounded-lg border bg-card">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">결제 목록</h2>

            {paymentsList.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">결제 내역이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentsList.map((payment) => {
                  const statusBadge = getPaymentStatusBadge(payment.payment_status)
                  const providerLabel = getProviderLabel(payment.payment_provider)

                  return (
                    <div
                      key={payment.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={statusBadge.variant}>
                              {statusBadge.label}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {providerLabel}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            결제 ID: <span className="font-mono">{payment.id.slice(0, 8)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {parseFloat(payment.amount).toLocaleString('ko-KR')}원
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {payment.payment_method || '카드'}
                          </div>
                        </div>
                      </div>

                      {/* Booking Info */}
                      {payment.booking && (
                        <div className="bg-muted/50 rounded p-3 mb-3">
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">예약:</span>
                              <Link
                                href={`/customer/bookings/${payment.booking_id}`}
                                className="text-primary hover:underline font-mono"
                              >
                                {payment.booking_id?.slice(0, 8)}
                              </Link>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">트레이너:</span>
                              <span className="font-semibold">
                                {getTrainerName(payment.booking)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">서비스:</span>
                              <span>
                                {payment.booking.service_type === 'pt' ? '개인 트레이닝' : '그룹 트레이닝'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Payment Details */}
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">결제일:</span>{' '}
                          <span className="font-medium">
                            {payment.paid_at ? formatDate(payment.paid_at) : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">요청일:</span>{' '}
                          <span className="font-medium">{formatDate(payment.created_at)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {payment.booking_id && (
                          <Link href={`/customer/bookings/${payment.booking_id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              예약 보기
                            </Button>
                          </Link>
                        )}
                        {payment.payment_status === 'paid' && (
                          <Button variant="outline" size="sm" disabled>
                            <Download className="h-4 w-4 mr-1" />
                            영수증 (준비중)
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
