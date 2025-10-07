'use client'

import { useEffect, useState } from 'react'

interface BookingDateDisplayProps {
  date: string
  format?: 'full' | 'date-only' | 'created' | 'booking'
  className?: string
}

export function BookingDateDisplay({ date, format = 'full', className }: BookingDateDisplayProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const formatDate = (dateString: string) => {
    // Null/undefined check
    if (!dateString) {
      return '-'
    }

    // Convert to KST timezone (UTC+9)
    const toKST = (date: Date): Date => {
      const utc = date.getTime() + date.getTimezoneOffset() * 60000
      return new Date(utc + 9 * 3600000)
    }

    let d: Date
    if (dateString.includes('T') || dateString.includes(' ')) {
      // Has time component - convert to KST
      d = toKST(new Date(dateString))
    } else {
      // Date only (YYYY-MM-DD) - force KST interpretation
      d = new Date(dateString + 'T00:00:00+09:00')
    }
    const year = d.getFullYear()
    const shortYear = String(year).slice(2)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]

    switch (format) {
      case 'booking':
        return `${shortYear}.${month}.${day} (${weekday}) ${hours}:${minutes}`
      case 'full':
        return `${year}.${month}.${day} ${hours}:${minutes}`
      case 'date-only':
        return `${year}.${month}.${day}`
      case 'created':
        return `${shortYear}.${month}.${day} ${hours}:${minutes}`
      default:
        return `${year}.${month}.${day} ${hours}:${minutes}`
    }
  }

  // Prevent hydration mismatch by only rendering on client
  if (!mounted) {
    return <span className={className}>...</span>
  }

  return (
    <span className={className}>
      {formatDate(date)}
    </span>
  )
}
