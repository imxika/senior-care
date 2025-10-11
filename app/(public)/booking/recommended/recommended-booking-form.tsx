"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { BookingCalendar } from "@/components/booking-calendar"
import { AddressSelector } from "@/components/address-selector"
import { createRecommendedBooking } from "./actions"
import { BOOKING_CONFIG } from "@/lib/constants"
import { formatPrice } from "@/lib/utils"

interface PricingPolicy {
  session_prices_v2?: {
    home_visit?: Record<string, number>
    center_visit?: Record<string, number>
    online?: Record<string, number>
  }
  duration_discounts?: Record<string, number>
}

interface RecommendedBookingFormProps {
  customerId: string
  initialSessionType?: string
  initialServiceType?: string
  pricingPolicy?: PricingPolicy | null
}

export function RecommendedBookingForm({
  customerId,
  initialSessionType = '1:1',
  initialServiceType,
  pricingPolicy
}: RecommendedBookingFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [serviceType, setServiceType] = useState(initialServiceType || '')
  const [sessionType, setSessionType] = useState(initialSessionType || '1:1')
  const [duration, setDuration] = useState('60')

  // 예상 가격 계산
  const estimatedPrice = useMemo(() => {
    if (!serviceType || !sessionType || !pricingPolicy) return null

    // 세션 타입별 기본 가격 조회
    const servicePrices = pricingPolicy.session_prices_v2?.[serviceType as keyof typeof pricingPolicy.session_prices_v2]
    if (!servicePrices) return null

    const basePrice = servicePrices[sessionType]
    if (!basePrice) return null

    // 시간당 가격에서 실제 소요 시간 계산
    const durationMinutes = parseInt(duration)
    const hours = durationMinutes / 60
    const subtotal = basePrice * hours

    // 시간 할인 적용
    const discount = pricingPolicy.duration_discounts?.[duration] || 1.0
    const finalPrice = Math.round(subtotal * discount)

    return {
      basePrice,
      hours,
      subtotal,
      discount,
      finalPrice
    }
  }, [serviceType, sessionType, duration, pricingPolicy])

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    setError(null)

    // 날짜와 시간 검증
    if (!selectedDate || !selectedTime) {
      setError('날짜와 시간을 선택해주세요.')
      setIsSubmitting(false)
      return
    }

    // FormData에 날짜와 시간 추가
    formData.set('date', selectedDate.toISOString().split('T')[0])
    formData.set('time', selectedTime)

    const result = await createRecommendedBooking(formData)

    if ('error' in result) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      // 성공 - 성공 페이지로 이동
      router.push('/booking/recommended/success')
    }
  }

  const handleDateTimeSelect = (date: Date | undefined, time: string | null) => {
    setSelectedDate(date)
    setSelectedTime(time)
  }

  const maxDate = new Date(Date.now() + BOOKING_CONFIG.ADVANCE_BOOKING_DAYS * 24 * 60 * 60 * 1000)

  return (
    <form action={handleSubmit} className="space-y-6">
      <input type="hidden" name="customer_id" value={customerId} />

      {/* 날짜 & 시간 선택 */}
      <div className="space-y-2">
        <Label>희망 날짜 및 시간 *</Label>
        <BookingCalendar
          onDateTimeSelect={handleDateTimeSelect}
          minDate={new Date()}
          maxDate={maxDate}
        />
        <p className="text-sm text-gray-500">
          실제 예약 시간은 매칭된 트레이너의 가용 시간에 따라 조정될 수 있습니다.
        </p>
      </div>

      {/* 세션 타입 */}
      <div className="space-y-2">
        <Label htmlFor="session_type">세션 유형 *</Label>
        <Select name="session_type" required value={sessionType} onValueChange={setSessionType}>
          <SelectTrigger>
            <SelectValue placeholder="세션 유형을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1:1">1:1 개인 세션</SelectItem>
            <SelectItem value="2:1">2:1 소그룹 (2명)</SelectItem>
            <SelectItem value="3:1">3:1 소그룹 (3명)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-gray-500">
          소그룹 세션은 함께 운동할 분과 비용을 나눌 수 있습니다.
        </p>
      </div>

      {/* 서비스 타입 */}
      <div className="space-y-2">
        <Label htmlFor="service_type">서비스 유형 *</Label>
        <Select name="service_type" required value={serviceType} onValueChange={setServiceType}>
          <SelectTrigger>
            <SelectValue placeholder="서비스 유형을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="home_visit">🏠 방문 서비스</SelectItem>
            <SelectItem value="center_visit">🏢 센터 방문</SelectItem>
            <SelectItem value="online">💻 온라인 세션</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          💡 온라인: 집에서 편하게 화상으로 진행해요
        </p>
      </div>

      {/* 예상 시간 */}
      <div className="space-y-2">
        <Label htmlFor="duration">예상 소요 시간 *</Label>
        <Select name="duration" required value={duration} onValueChange={setDuration}>
          <SelectTrigger>
            <SelectValue placeholder="소요 시간을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30분</SelectItem>
            <SelectItem value="60">1시간</SelectItem>
            <SelectItem value="90">1시간 30분</SelectItem>
            <SelectItem value="120">2시간</SelectItem>
            <SelectItem value="150">2시간 30분</SelectItem>
            <SelectItem value="180">3시간</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Address Selector - Only show for home visit */}
      {serviceType === 'home_visit' && (
        <AddressSelector
          customerId={customerId}
          serviceType={serviceType}
        />
      )}

      {/* 필요한 전문분야 */}
      <div className="space-y-2">
        <Label htmlFor="specialty_needed">필요한 전문분야</Label>
        <Input
          type="text"
          id="specialty_needed"
          name="specialty_needed"
          placeholder="예: 재활 운동, 균형감각, 낙상예방"
        />
        <p className="text-sm text-gray-500">
          원하시는 전문분야를 입력하면 더 정확한 매칭이 가능합니다.
        </p>
      </div>

      {/* 요청사항 */}
      <div className="space-y-2">
        <Label htmlFor="notes">요청사항</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="특별히 고려해야 할 사항이나 요청사항을 입력해주세요..."
          rows={4}
        />
      </div>

      {/* 예상 요금 안내 */}
      <div className="p-4 bg-gray-50 rounded-lg space-y-3">
        <h4 className="font-semibold">예상 요금</h4>

        {estimatedPrice ? (
          <>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">시간당 요금:</span>
                <span className="font-medium">{formatPrice(estimatedPrice.basePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">소요 시간:</span>
                <span className="font-medium">{estimatedPrice.hours}시간</span>
              </div>
              {estimatedPrice.discount < 1.0 && (
                <div className="flex justify-between text-green-600">
                  <span>시간 할인:</span>
                  <span className="font-medium">{((1 - estimatedPrice.discount) * 100).toFixed(0)}% 할인</span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-300 flex justify-between">
                <span className="font-semibold">예상 총액:</span>
                <span className="font-bold text-lg text-blue-600">{formatPrice(estimatedPrice.finalPrice)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              * 트레이너 매칭 후 정확한 금액이 확정됩니다
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-600">
            세션 유형과 서비스 유형을 선택하면 예상 요금을 확인할 수 있습니다.
          </p>
        )}

        <p className="text-sm font-medium text-green-600">
          ✓ 추천 예약은 추가 비용이 없습니다
        </p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 제출 버튼 */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          취소
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              예약 요청 중...
            </>
          ) : (
            "예약 요청하기"
          )}
        </Button>
      </div>
    </form>
  )
}
