'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'

export function TrainerBookingFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const currentStatus = searchParams.get('status') || 'all'
  const currentType = searchParams.get('type') || 'all'
  const currentSort = searchParams.get('sort') || 'booking_date'
  const currentSearch = searchParams.get('search') || ''

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }

    // 필터 변경 시 1페이지로 리셋
    if (key !== 'page') {
      params.set('page', '1')
    }

    router.push(`/trainer/bookings?${params.toString()}`)
  }

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value

    // 이전 타이머 취소
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // 150ms 후 검색 실행
    debounceTimer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (searchValue) {
        params.set('search', searchValue)
      } else {
        params.delete('search')
      }
      params.set('page', '1')

      router.push(`/trainer/bookings?${params.toString()}`)
    }, 150)
  }, [router, searchParams])

  return (
    <div className="flex items-center gap-2">
      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="고객 검색..."
          defaultValue={currentSearch}
          onChange={handleSearchChange}
          className="pl-9 w-40"
        />
      </div>

      {/* 상태 필터 */}
      <Select value={currentStatus} onValueChange={(value) => updateFilter('status', value)}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="상태" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          <SelectItem value="pending">대기중</SelectItem>
          <SelectItem value="confirmed">확정</SelectItem>
          <SelectItem value="completed">완료</SelectItem>
          <SelectItem value="cancelled">취소</SelectItem>
        </SelectContent>
      </Select>

      {/* 타입 필터 */}
      <Select value={currentType} onValueChange={(value) => updateFilter('type', value)}>
        <SelectTrigger className="w-28">
          <SelectValue placeholder="타입" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          <SelectItem value="direct">지정</SelectItem>
          <SelectItem value="recommended">추천</SelectItem>
        </SelectContent>
      </Select>

      {/* 정렬 */}
      <Select value={currentSort} onValueChange={(value) => updateFilter('sort', value)}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="정렬" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="booking_date">예약일순</SelectItem>
          <SelectItem value="created_at">생성일순</SelectItem>
          <SelectItem value="status">상태순</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
