'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

interface BookingFilterBarProps {
  currentStatus?: string
  currentType?: string
  currentSearch?: string
}

export function BookingFilterBar({ currentStatus, currentType, currentSearch }: BookingFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchInput, setSearchInput] = useState(currentSearch || '')

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams()

    // 현재 필터 유지
    if (currentStatus && key !== 'status') params.set('status', currentStatus)
    if (currentType && key !== 'type') params.set('type', currentType)
    if (currentSearch && key !== 'search') params.set('search', currentSearch)

    // 새 값 설정
    if (value && value !== 'all') {
      params.set(key, value)
    }

    router.push(`${pathname}?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearchInput('')
    router.push(pathname)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters('search', searchInput || null)
  }

  const hasActiveFilters = currentStatus || currentType || currentSearch

  return (
    <div className="space-y-3">
      {/* Filter Controls */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="고객명, 트레이너명, 예약번호로 검색..."
            className="pl-10"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>

        {/* Status Filter */}
        <Select value={currentStatus || 'all'} onValueChange={(value) => updateFilters('status', value)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="상태 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="pending">승인 대기</SelectItem>
            <SelectItem value="confirmed">확정</SelectItem>
            <SelectItem value="completed">완료</SelectItem>
            <SelectItem value="cancelled">취소</SelectItem>
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select value={currentType || 'all'} onValueChange={(value) => updateFilters('type', value)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="예약 유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 유형</SelectItem>
            <SelectItem value="direct">지정 예약</SelectItem>
            <SelectItem value="recommended">추천 예약</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Button */}
        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters} title="필터 초기화">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">활성 필터:</span>
          {currentStatus && (
            <Badge variant="secondary" className="gap-1">
              상태: {currentStatus}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilters('status', null)}
              />
            </Badge>
          )}
          {currentType && (
            <Badge variant="secondary" className="gap-1">
              유형: {currentType === 'direct' ? '지정' : '추천'}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilters('type', null)}
              />
            </Badge>
          )}
          {currentSearch && (
            <Badge variant="secondary" className="gap-1">
              검색: {currentSearch}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  setSearchInput('')
                  updateFilters('search', null)
                }}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
