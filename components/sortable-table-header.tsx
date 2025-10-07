'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

interface SortableTableHeaderProps {
  label: string
  sortKey: string
  className?: string
  basePath?: string  // 경로를 동적으로 받을 수 있도록
}

export function SortableTableHeader({ label, sortKey, className = '', basePath }: SortableTableHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentSort = searchParams.get('sort') || 'updated_at'
  const currentDirection = searchParams.get('direction') || 'desc'

  const isActive = currentSort === sortKey

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString())

    // 같은 컬럼 클릭 시 방향 토글
    if (isActive) {
      const newDirection = currentDirection === 'asc' ? 'desc' : 'asc'
      params.set('direction', newDirection)
    } else {
      // 새로운 컬럼 클릭 시 해당 컬럼으로 설정하고 내림차순
      params.set('sort', sortKey)
      params.set('direction', 'desc')
    }

    // basePath가 제공되면 사용, 아니면 기본 트레이너 경로
    const path = basePath || '/trainer/bookings'
    router.push(`${path}?${params.toString()}`)
  }

  return (
    <th
      className={`text-left p-3 font-semibold cursor-pointer select-none hover:bg-muted/70 transition-colors ${className}`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          currentDirection === 'asc' ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-30" />
        )}
      </div>
    </th>
  )
}
