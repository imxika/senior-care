'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Home, Building, Users, Loader2, Phone } from 'lucide-react'
import { BookingCalendar } from '@/components/booking-calendar'
import { BookingParticipantsManager } from '@/components/booking-participants-manager'
import { AddressSelector } from '@/components/address-selector'
import { createBooking } from '@/app/(public)/trainers/[id]/booking/actions'
import { formatKSTDate } from '@/lib/date-utils'
import type { TrainerPricingConfig, PlatformPricingPolicy, SessionType, DurationMinutes } from '@/lib/pricing-utils'
import { calculatePrice } from '@/lib/pricing-client'

interface Participant {
  id: string
  customer_id?: string
  customer_name?: string
  customer_email?: string
  guest_name?: string
  guest_phone?: string
  guest_email?: string
  guest_birth_date?: string
  guest_gender?: string
  payment_amount: number
  payment_status: 'pending' | 'paid' | 'refunded' | 'cancelled'
  is_primary: boolean
}

interface BookingFormProps {
  trainerId: string
  customerId: string
  homeVisitAvailable: boolean
  centerVisitAvailable: boolean
  trainerMaxGroupSize: number
  initialSessionType?: '1:1' | '2:1' | '3:1'
  initialServiceType?: 'home' | 'center' | 'all'
  hourlyRate?: number
  centerName?: string | null
  centerAddress?: string | null
  centerPhone?: string | null
  pricingConfig: TrainerPricingConfig
  pricingPolicy: PlatformPricingPolicy
}

export function BookingForm({
  trainerId,
  customerId,
  homeVisitAvailable,
  centerVisitAvailable,
  trainerMaxGroupSize,
  initialSessionType = '1:1',
  initialServiceType,
  hourlyRate = 100000,
  centerName,
  centerAddress,
  centerPhone,
  pricingConfig,
  pricingPolicy
}: BookingFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [sessionType, setSessionType] = useState<string>(initialSessionType)
  const [serviceType, setServiceType] = useState(
    initialServiceType && initialServiceType !== 'all' ? initialServiceType : ''
  )
  const [duration, setDuration] = useState('')
  const [participants, setParticipants] = useState<Participant[]>([])

  // Calculate total price using pricing policy
  const totalPrice = duration && sessionType
    ? calculatePrice(
        sessionType as SessionType,
        parseInt(duration) as DurationMinutes,
        pricingConfig,
        pricingPolicy
      ).final_price
    : 0

  // Get max participants based on session type and trainer's max group size
  const sessionTypeMaxParticipants = sessionType === '1:1' ? 1 : sessionType === '2:1' ? 2 : 3
  const maxParticipants = Math.min(sessionTypeMaxParticipants, trainerMaxGroupSize)
  const isGroupSession = sessionType !== '1:1'

  // Check if selected session type exceeds trainer's max group size
  const sessionTypeExceedsLimit = sessionTypeMaxParticipants > trainerMaxGroupSize

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // 날짜와 시간 검증
    if (!selectedDate || !selectedTime) {
      setError('날짜와 시간을 선택해주세요.')
      setIsLoading(false)
      return
    }

    // 트레이너 최대 인원 검증
    if (sessionTypeExceedsLimit) {
      setError(`이 트레이너는 최대 ${trainerMaxGroupSize}명까지만 그룹 세션을 제공합니다. 다른 세션 유형을 선택해주세요.`)
      setIsLoading(false)
      return
    }

    // 그룹 세션 참가자 검증
    if (isGroupSession && participants.length === 0) {
      setError('참가자를 추가해주세요.')
      setIsLoading(false)
      return
    }

    // 그룹 세션 참가자 수 검증
    if (isGroupSession && participants.length > maxParticipants) {
      setError(`최대 ${maxParticipants}명까지만 참가할 수 있습니다.`)
      setIsLoading(false)
      return
    }

    const formData = new FormData(e.currentTarget)

    // Add date, time and select values to formData
    // Use formatKSTDate to ensure correct KST date format
    formData.set('date', formatKSTDate(selectedDate))
    formData.set('time', selectedTime)
    formData.set('session_type', sessionType)
    formData.set('service_type', serviceType)
    formData.set('duration', duration)

    // Add participants data as JSON string
    if (isGroupSession) {
      formData.set('participants', JSON.stringify(participants))
    }

    try {
      const result = await createBooking(formData)

      if (result?.error) {
        setError(result.error)
        setIsLoading(false)
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
      setIsLoading(false)
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

      {/* Session Type */}
      <div className="space-y-2">
        <Label htmlFor="session-type">세션 유형</Label>
        <Select name="session_type" required value={sessionType} onValueChange={setSessionType}>
          <SelectTrigger>
            <SelectValue placeholder="세션 유형 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1:1">1:1 개인 세션</SelectItem>
            <SelectItem value="2:1" disabled={trainerMaxGroupSize < 2}>
              2:1 소그룹 (2명) {trainerMaxGroupSize < 2 && '(제공 불가)'}
            </SelectItem>
            <SelectItem value="3:1" disabled={trainerMaxGroupSize < 3}>
              3:1 소그룹 (3명) {trainerMaxGroupSize < 3 && '(제공 불가)'}
            </SelectItem>
          </SelectContent>
        </Select>
        {sessionTypeExceedsLimit && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive font-medium">
              ⚠️ 이 트레이너는 최대 {trainerMaxGroupSize}명까지만 그룹 세션을 제공합니다.
            </p>
          </div>
        )}
        {!sessionTypeExceedsLimit && (
          <p className="text-sm text-muted-foreground">
            소그룹 세션은 함께 운동할 분과 비용을 나눌 수 있습니다.
          </p>
        )}
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

      {/* Address Selector - Only show for home visit */}
      {serviceType === 'home' && (
        <AddressSelector
          customerId={customerId}
          serviceType={serviceType}
        />
      )}

      {/* Center Information - Only show for center visit */}
      {serviceType === 'center' && centerName && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building className="h-5 w-5" />
              센터 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">센터 이름</p>
                <p className="font-semibold text-base">{centerName}</p>
              </div>
              {centerAddress && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">주소</p>
                    <p className="text-sm">{centerAddress}</p>
                  </div>
                </>
              )}
              {centerPhone && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">연락처</p>
                    <a
                      href={`tel:${centerPhone}`}
                      className="text-sm text-primary hover:underline flex items-center gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      {centerPhone}
                    </a>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
        {totalPrice > 0 && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">예상 비용</span>
              <span className="text-xl font-bold text-primary">
                {totalPrice.toLocaleString()}원
              </span>
            </div>
            {isGroupSession && (
              <p className="text-xs text-muted-foreground mt-1">
                참가자당 약 {Math.round(totalPrice / maxParticipants).toLocaleString()}원
              </p>
            )}
          </div>
        )}
      </div>

      {/* Group Session Participants - Only show for 2:1 and 3:1 */}
      {isGroupSession && totalPrice > 0 && (
        <>
          <Separator />
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                참가자 관리
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                함께 운동할 분들을 추가하세요. 예약 시 호스트(본인)가 전액 결제하고,
                참가자가 수락하면 부분 환급됩니다.
              </p>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 bg-background rounded-lg border">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">총 예상 금액</span>
                  <span className="text-lg font-bold text-primary">
                    {totalPrice.toLocaleString()}원
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  참가자당 약 {Math.round(totalPrice / maxParticipants).toLocaleString()}원
                </p>
              </div>

              <BookingParticipantsManager
                sessionType={sessionType as '1:1' | '2:1' | '3:1'}
                maxParticipants={maxParticipants}
                totalPrice={totalPrice}
                participants={participants}
                onParticipantsChange={setParticipants}
              />
            </CardContent>
          </Card>
        </>
      )}

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

      {/* 주차 안내 - 방문 서비스일 때만 표시 */}
      {serviceType === 'home' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">🅿️ 주차 안내</p>
          <ul className="space-y-1 text-xs">
            <li>• 고객 측 주차 제공 불가 시, 인근 유료 주차장 이용</li>
            <li>• 주차비는 서비스 종료 후 별도 청구됩니다</li>
          </ul>
        </div>
      )}

      {/* Submit */}
      <div className="pt-4">
        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              예약 처리 중...
            </>
          ) : (
            '예약 요청하기'
          )}
        </Button>
        <p className="text-sm text-muted-foreground text-center mt-3">
          예약 요청 후 트레이너가 확인하면 알림을 받게 됩니다
        </p>
      </div>
    </form>
  )
}
