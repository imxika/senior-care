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
    <div className="flex flex-col gap-2 w-full md:flex-row md:items-center md:w-auto">
      {/* 검색 */}
      <div className="relative w-full md:w-40">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="검색..."
          defaultValue={currentSearch}
          onChange={handleSearchChange}
          className="pl-9 w-full"
        />
      </div>

      {/* 필터 그룹 - 모바일에서 2열 그리드 */}
      <div className="grid grid-cols-2 gap-2 md:flex md:gap-2">
        {/* 상태 필터 */}
        <Select value={currentStatus} onValueChange={(value) => updateFilter('status', value)}>
          <SelectTrigger className="w-full md:w-28">
            <SelectValue>
              {currentStatus === 'all' ? '상태: 전체' :
               currentStatus === 'pending' ? '상태: 대기' :
               currentStatus === 'confirmed' ? '상태: 확정' :
               currentStatus === 'completed' ? '상태: 완료' :
               currentStatus === 'cancelled' ? '상태: 취소' : '상태'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="pending">대기</SelectItem>
            <SelectItem value="confirmed">확정</SelectItem>
            <SelectItem value="completed">완료</SelectItem>
            <SelectItem value="cancelled">취소</SelectItem>
          </SelectContent>
        </Select>

        {/* 타입 필터 */}
        <Select value={currentType} onValueChange={(value) => updateFilter('type', value)}>
          <SelectTrigger className="w-full md:w-28">
            <SelectValue>
              {currentType === 'all' ? '타입: 전체' :
               currentType === 'direct' ? '타입: 지정' :
               currentType === 'recommended' ? '타입: 추천' : '타입'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="direct">지정</SelectItem>
            <SelectItem value="recommended">추천</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
