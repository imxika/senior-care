'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BOOKING_STATUS_CONFIG } from '@/lib/constants'
import { BookingFilters } from './booking-filters'
import { Eye, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

interface Booking {
  id: string
  customer_id: string
  trainer_id?: string
  booking_type: string
  service_type: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  total_price: number
  created_at: string
  updated_at: string
  admin_matched_at?: string
  customer?: {
    id: string
    profile?: {
      full_name?: string
      email?: string
      phone?: string
    }
  }
  trainer?: {
    id: string
    hourly_rate?: number
    specialties?: string[]
    profile?: {
      full_name?: string
      email?: string
    }
  }
}

interface Props {
  bookings: Booking[]
  currentPage: number
  totalPages: number
  params: {
    status?: string
    type?: string
    search?: string
    sort?: string
    direction?: string
    page?: string
  }
}

const ITEMS_PER_PAGE = 10

export function BookingsTable({ bookings, currentPage, totalPages, params }: Props) {
  const [sortBy, setSortBy] = useState(params.sort || 'updated_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(params.direction === 'asc' ? 'asc' : 'desc')

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 opacity-30 ml-1" />
    }
    return sortDirection === 'asc' ?
      <ArrowUp className="h-4 w-4 ml-1" /> :
      <ArrowDown className="h-4 w-4 ml-1" />
  }

  // 정렬
  let sortedBookings = [...bookings]
  sortedBookings.sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'booking_date':
        comparison = new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime()
        break
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
      case 'updated_at':
        const aDate = a.updated_at || a.created_at
        const bDate = b.updated_at || b.created_at
        comparison = new Date(aDate).getTime() - new Date(bDate).getTime()
        break
      case 'customer_name':
        const nameA = a.customer?.profile?.full_name || ''
        const nameB = b.customer?.profile?.full_name || ''
        comparison = nameA.localeCompare(nameB)
        break
      case 'status':
        comparison = a.status.localeCompare(b.status)
        break
      default:
        comparison = 0
    }

    return sortDirection === 'asc' ? comparison : -comparison
  })

  // 승인대기 항목을 최상단으로
  sortedBookings.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return 0
  })

  // 페이지네이션
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedBookings = sortedBookings.slice(startIndex, endIndex)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>예약 목록 ({sortedBookings.length}건)</CardTitle>
          <BookingFilters />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium">예약번호</th>
                <th className="px-4 py-3 text-left text-xs font-medium">타입</th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleSort('customer_name')}
                >
                  <div className="flex items-center">
                    고객
                    {getSortIcon('customer_name')}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium">트레이너</th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleSort('booking_date')}
                >
                  <div className="flex items-center">
                    예약일시
                    {getSortIcon('booking_date')}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleSort('updated_at')}
                >
                  <div className="flex items-center">
                    최근 활동
                    {getSortIcon('updated_at')}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    상태
                    {getSortIcon('status')}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedBookings.map(booking => (
                <BookingTableRow key={booking.id} booking={booking} />
              ))}
              {paginatedBookings.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    예약이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {startIndex + 1}-{Math.min(endIndex, sortedBookings.length)} / {sortedBookings.length}건
            </p>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Link
                  key={page}
                  href={`/admin/bookings?page=${page}&status=${params.status || ''}&type=${params.type || ''}&search=${params.search || ''}`}
                >
                  <Button
                    variant={page === currentPage ? 'default' : 'outline'}
                    size="sm"
                  >
                    {page}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BookingTableRow({ booking }: { booking: Booking }) {
  const statusConfig = BOOKING_STATUS_CONFIG[booking.status as keyof typeof BOOKING_STATUS_CONFIG] || BOOKING_STATUS_CONFIG.pending
  const isPending = booking.status === 'pending'
  const isRecommendedUnmatched = booking.booking_type === 'recommended' && !booking.trainer_id

  // 예약일시 - KST timezone 처리
  const toKST = (date: Date) => {
    const utc = date.getTime() + date.getTimezoneOffset() * 60000
    return new Date(utc + 9 * 3600000)
  }

  const bookingDate = new Date(booking.booking_date + 'T00:00:00+09:00')
  const startTime = booking.start_time.slice(0, 5)

  // 최근 활동 - KST timezone 처리
  const activityDate = toKST(new Date(booking.updated_at || booking.created_at))

  return (
    <tr className={`hover:bg-muted/50 ${isPending ? 'bg-yellow-50' : ''}`}>
      <td className="px-4 py-3 text-sm font-mono">#{booking.id.slice(0, 8)}</td>
      <td className="px-4 py-3">
        {booking.booking_type === 'recommended' ? (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            추천
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            지정
          </Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium">
          {booking.customer?.profile?.full_name || '정보 없음'}
        </div>
        <div className="text-xs text-muted-foreground">{booking.customer?.profile?.email}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">
          {booking.trainer?.profile?.full_name || (
            <span className={isRecommendedUnmatched ? 'text-orange-600 font-medium' : 'text-muted-foreground'}>
              {isRecommendedUnmatched ? '매칭 대기' : '-'}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm">
        {bookingDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} {startTime}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {activityDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </td>
      <td className="px-4 py-3">
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {isRecommendedUnmatched && (
            <Link href={`/admin/bookings/recommended/${booking.id}/match`}>
              <Button variant="default" size="sm">
                매칭
              </Button>
            </Link>
          )}
          <Link href={`/admin/bookings/${booking.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              상세보기
            </Button>
          </Link>
        </div>
      </td>
    </tr>
  )
}
