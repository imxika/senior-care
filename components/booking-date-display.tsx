'use client'

interface BookingDateDisplayProps {
  date: string
  format?: 'full' | 'date-only' | 'created' | 'booking'
  className?: string
}

export function BookingDateDisplay({ date, format = 'full', className }: BookingDateDisplayProps) {
  const formatDate = (dateString: string) => {
    const d = new Date(dateString)
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
        return `${shortYear}.${month}.${day}`
      default:
        return `${year}.${month}.${day} ${hours}:${minutes}`
    }
  }

  return (
    <span className={className} suppressHydrationWarning>
      {formatDate(date)}
    </span>
  )
}
