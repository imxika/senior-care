/**
 * Date utility functions for Korean Standard Time (KST, UTC+9)
 * Ensures consistent date handling across the application
 */

/**
 * Get current date and time in KST
 */
export function getKSTNow(): Date {
  const now = new Date()
  return toKST(now)
}

/**
 * Convert any Date to KST Date object
 */
export function toKST(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date
  const utc = d.getTime() + d.getTimezoneOffset() * 60000
  return new Date(utc + 9 * 3600000) // Add 9 hours for KST
}

/**
 * Create a Date object from date string in KST timezone
 * Input: "2025-10-10" (YYYY-MM-DD)
 * Output: Date object representing that date at midnight KST
 */
export function parseKSTDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  // Create date as if it's in KST
  const date = new Date(Date.UTC(year, month - 1, day))
  // Subtract 9 hours to compensate for KST offset
  return new Date(date.getTime() - 9 * 3600000)
}

/**
 * Format Date to YYYY-MM-DD string in KST
 * If input is already YYYY-MM-DD string, return as-is
 */
export function formatKSTDate(date: Date | string): string {
  // If it's already a YYYY-MM-DD string, return as-is
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date
  }

  const d = toKST(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format Date to display format: M.D (요일)
 * Example: "10.10 (목)"
 */
export function formatKSTDateDisplay(date: Date | string): string {
  const d = toKST(date)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  const weekday = weekdays[d.getDay()]
  return `${month}.${day} (${weekday})`
}

/**
 * Format time to HH:MM
 */
export function formatTime(time: string | Date): string {
  if (typeof time === 'string') {
    return time.slice(0, 5) // HH:MM
  }
  const d = toKST(time)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Get KST timestamp for database storage
 * Returns ISO string adjusted for KST
 */
export function getKSTTimestamp(date?: Date | string): string {
  const d = date ? toKST(date) : getKSTNow()
  return d.toISOString()
}

/**
 * Parse database timestamp and return KST Date
 */
export function parseDBTimestamp(timestamp: string): Date {
  return toKST(new Date(timestamp))
}

/**
 * Check if a date is in the past (KST)
 */
export function isDateInPast(date: Date | string): boolean {
  const d = toKST(date)
  const now = getKSTNow()
  d.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return d < now
}

/**
 * Check if a date is today (KST)
 */
export function isToday(date: Date | string): boolean {
  const d = toKST(date)
  const now = getKSTNow()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

/**
 * Calculate time range from start time and duration
 * Returns time strings in HH:MM:SS format for KST
 */
export function calculateKSTTimeRange(startTime: string, durationMinutes: number): {
  start_time: string
  end_time: string
} {
  const [hours, minutes] = startTime.split(':').map(Number)
  const now = getKSTNow()
  now.setHours(hours, minutes, 0, 0)

  const endDate = new Date(now.getTime() + durationMinutes * 60000)

  const start_time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
  const end_time = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00`

  return { start_time, end_time }
}

/**
 * Combine date and time strings into a KST Date object
 */
export function combineKSTDateTime(dateString: string, timeString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  const [hours, minutes] = timeString.split(':').map(Number)

  // Create date in UTC and adjust for KST
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))
  return new Date(date.getTime() - 9 * 3600000)
}
