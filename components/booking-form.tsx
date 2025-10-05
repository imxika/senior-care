'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { MapPin, Home, Building } from 'lucide-react'
import { BookingCalendar } from '@/components/booking-calendar'
import { createBooking } from '@/app/(public)/trainers/[id]/booking/actions'

interface BookingFormProps {
  trainerId: string
  homeVisitAvailable: boolean
  centerVisitAvailable: boolean
}

export function BookingForm({ trainerId, homeVisitAvailable, centerVisitAvailable }: BookingFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [serviceType, setServiceType] = useState('')
  const [duration, setDuration] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 날짜와 시간 검증
    if (!selectedDate || !selectedTime) {
      setError('날짜와 시간을 선택해주세요.')
      setLoading(false)
      return
    }

    const formData = new FormData(e.currentTarget)

    // Add date, time and select values to formData
    formData.set('date', selectedDate.toISOString().split('T')[0])
    formData.set('time', selectedTime)
    formData.set('service_type', serviceType)
    formData.set('duration', duration)

    try {
      const result = await createBooking(formData)

      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
      // Success case - redirect is handled by server action
      // redirect() throws an error internally, which is expected behavior
    } catch (err) {
      // Check if it's a Next.js redirect error (NEXT_REDIRECT)
      if (err && typeof err === 'object' && 'digest' in err) {
        // This is a redirect, not an actual error - let it propagate
        throw err
      }
      // Only handle actual errors
      console.error('Booking error:', err)
      setError('예약 처리 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const handleDateTimeSelect = (date: Date | undefined, time: string | null) => {
    setSelectedDate(date)
    setSelectedTime(time)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Hidden trainer ID */}
      <input type="hidden" name="trainer_id" value={trainerId} />

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Date & Time */}
      <div className="space-y-2">
        <Label>희망 날짜 및 시간</Label>
        <BookingCalendar
          onDateTimeSelect={handleDateTimeSelect}
          minDate={new Date()}
        />
      </div>

      {/* Service Type */}
      <div className="space-y-2">
        <Label htmlFor="service-type">
          <MapPin className="h-4 w-4 inline mr-2" />
          서비스 유형
        </Label>
        <Select name="service_type" required value={serviceType} onValueChange={setServiceType}>
          <SelectTrigger>
            <SelectValue placeholder="서비스 유형 선택" />
          </SelectTrigger>
          <SelectContent>
            {homeVisitAvailable && (
              <SelectItem value="home">
                <div className="flex items-center">
                  <Home className="h-4 w-4 mr-2" />
                  방문 서비스
                </div>
              </SelectItem>
            )}
            {centerVisitAvailable && (
              <SelectItem value="center">
                <div className="flex items-center">
                  <Building className="h-4 w-4 mr-2" />
                  센터 방문
                </div>
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label htmlFor="duration">예상 시간</Label>
        <Select name="duration" required value={duration} onValueChange={setDuration}>
          <SelectTrigger>
            <SelectValue placeholder="시간 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="60">1시간</SelectItem>
            <SelectItem value="90">1시간 30분</SelectItem>
            <SelectItem value="120">2시간</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">요청사항 (선택)</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="특별히 요청하실 사항이나 전달하고 싶은 내용을 입력해주세요"
          rows={4}
        />
      </div>

      {/* Submit */}
      <div className="pt-4">
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? '예약 처리 중...' : '예약 요청하기'}
        </Button>
        <p className="text-sm text-muted-foreground text-center mt-3">
          예약 요청 후 트레이너가 확인하면 알림을 받게 됩니다
        </p>
      </div>
    </form>
  )
}
