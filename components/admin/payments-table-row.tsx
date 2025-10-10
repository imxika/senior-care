'use client'

import { TableCell, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { RefundPaymentDialog } from './refund-payment-dialog'

interface Profile {
  full_name?: string;
}

interface Customer {
  profile?: Profile | Profile[];
}

interface Booking {
  id: string;
  booking_date?: string;
  start_time?: string;
  customer?: Customer;
}

interface Payment {
  id: string;
  amount: string;
  payment_status: string;
  payment_provider: string;
  payment_method?: string;
  paid_at?: string;
  created_at: string;
  booking?: Booking | Booking[];
}

interface PaymentsTableRowProps {
  payment: Payment
}

export function PaymentsTableRow({ payment }: PaymentsTableRowProps) {
  const statusBadge =
    payment.payment_status === 'paid' ? { label: '✅ 완료', variant: 'default' as const } :
    payment.payment_status === 'pending' ? { label: '⏳ 대기', variant: 'secondary' as const } :
    payment.payment_status === 'refunded' ? { label: '🔄 환불', variant: 'outline' as const } :
    payment.payment_status === 'cancelled' ? { label: '🚫 취소', variant: 'destructive' as const } :
    { label: '❌ 실패', variant: 'destructive' as const }

  const providerLabel = payment.payment_provider === 'stripe' ? '💵 Stripe' : '💳 Toss'

  const booking = Array.isArray(payment.booking) ? payment.booking[0] : payment.booking
  const customer = booking?.customer
  const customerProfile = Array.isArray(customer?.profile) ? customer.profile[0] : customer?.profile

  return (
    <TableRow key={payment.id}>
      <TableCell className="text-sm">
        {payment.paid_at
          ? new Date(payment.paid_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
          : new Date(payment.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
        }
      </TableCell>
      <TableCell className="text-sm">
        {customerProfile?.full_name || '정보 없음'}
      </TableCell>
      <TableCell className="text-sm">
        {booking?.booking_date ? new Date(booking.booking_date).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-'}
      </TableCell>
      <TableCell className="font-medium">
        {parseFloat(payment.amount).toLocaleString()}원
      </TableCell>
      <TableCell className="text-sm">
        {payment.payment_method || '-'}
      </TableCell>
      <TableCell>
        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
      </TableCell>
      <TableCell className="text-sm">
        {providerLabel}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/bookings/${booking?.id}`}
            className="text-sm text-blue-600 hover:underline"
          >
            예약 보기
          </Link>
          {payment.payment_status === 'paid' && (
            <RefundPaymentDialog
              paymentId={payment.id}
              amount={payment.amount}
              provider={payment.payment_provider}
              bookingDate={booking?.booking_date}
              startTime={booking?.start_time}
            />
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
