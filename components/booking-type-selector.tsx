"use client"

import { BOOKING_TYPE, BOOKING_TYPE_CONFIG } from "@/lib/constants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface BookingTypeSelectorProps {
  selectedType: 'direct' | 'recommended'
  onSelect: (type: 'direct' | 'recommended') => void
  trainerName?: string
}

export function BookingTypeSelector({
  selectedType,
  onSelect,
  trainerName
}: BookingTypeSelectorProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* 지정 예약 */}
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          selectedType === BOOKING_TYPE.DIRECT && "border-blue-500 ring-2 ring-blue-500"
        )}
        onClick={() => onSelect(BOOKING_TYPE.DIRECT)}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {BOOKING_TYPE_CONFIG.direct.label}
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {BOOKING_TYPE_CONFIG.direct.badge}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-2">
                {trainerName ? `${trainerName} 트레이너와 ` : ''}
                {BOOKING_TYPE_CONFIG.direct.description}
              </CardDescription>
            </div>
            {selectedType === BOOKING_TYPE.DIRECT && (
              <Check className="h-5 w-5 text-blue-600" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              ✓ 원하는 트레이너 직접 선택
            </p>
            <p className="text-sm text-gray-600">
              ✓ 즉시 예약 확정 가능
            </p>
            <p className="text-sm text-gray-600">
              ✓ 트레이너 프로필 확인 가능
            </p>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-blue-600">
                기본 요금의 {Math.round((BOOKING_TYPE_CONFIG.direct.priceMultiplier - 1) * 100)}% 추가
              </p>
              <p className="text-xs text-gray-500 mt-1">
                프리미엄 서비스 제공
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 추천 예약 */}
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          selectedType === BOOKING_TYPE.RECOMMENDED && "border-green-500 ring-2 ring-green-500"
        )}
        onClick={() => onSelect(BOOKING_TYPE.RECOMMENDED)}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {BOOKING_TYPE_CONFIG.recommended.label}
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {BOOKING_TYPE_CONFIG.recommended.badge}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-2">
                {BOOKING_TYPE_CONFIG.recommended.description}
              </CardDescription>
            </div>
            {selectedType === BOOKING_TYPE.RECOMMENDED && (
              <Check className="h-5 w-5 text-green-600" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              ✓ 거리와 필요에 맞는 최적 매칭
            </p>
            <p className="text-sm text-gray-600">
              ✓ 관리자의 전문적인 추천
            </p>
            <p className="text-sm text-gray-600">
              ✓ 합리적인 가격
            </p>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-green-600">
                기본 요금 그대로
              </p>
              <p className="text-xs text-gray-500 mt-1">
                추가 비용 없음
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
