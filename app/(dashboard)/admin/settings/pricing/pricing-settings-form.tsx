'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { updatePricingPolicy } from './actions'
import { Loader2 } from 'lucide-react'

interface PricingPolicy {
  id: string
  commission_recommended: number
  commission_direct: number
  duration_discounts: {
    '60': number
    '90': number
    '120': number
  }
  session_prices: {
    '1:1': number
    '2:1': number
    '3:1': number
  }
  is_active: boolean
  effective_from: string
}

interface PricingSettingsFormProps {
  initialData: PricingPolicy
}

export default function PricingSettingsForm({ initialData }: PricingSettingsFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Commission rates
  const [commissionRecommended, setCommissionRecommended] = useState(initialData.commission_recommended)
  const [commissionDirect, setCommissionDirect] = useState(initialData.commission_direct)

  // Duration discounts (as percentages: 100% = no discount, 95% = 5% discount)
  const [discount60, setDiscount60] = useState(initialData.duration_discounts['60'] * 100)
  const [discount90, setDiscount90] = useState(initialData.duration_discounts['90'] * 100)
  const [discount120, setDiscount120] = useState(initialData.duration_discounts['120'] * 100)

  // Session prices
  const [price1on1, setPrice1on1] = useState(initialData.session_prices['1:1'])
  const [price2on1, setPrice2on1] = useState(initialData.session_prices['2:1'])
  const [price3on1, setPrice3on1] = useState(initialData.session_prices['3:1'])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData()
    formData.append('policy_id', initialData.id)
    formData.append('commission_recommended', commissionRecommended.toString())
    formData.append('commission_direct', commissionDirect.toString())
    formData.append('discount_60', (discount60 / 100).toString())
    formData.append('discount_90', (discount90 / 100).toString())
    formData.append('discount_120', (discount120 / 100).toString())
    formData.append('price_1on1', price1on1.toString())
    formData.append('price_2on1', price2on1.toString())
    formData.append('price_3on1', price3on1.toString())

    const result = await updatePricingPolicy(formData)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    }

    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          <p className="font-semibold">오류 발생</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
          <p className="font-semibold">저장 완료</p>
          <p className="text-sm">가격 정책이 성공적으로 업데이트되었습니다.</p>
        </div>
      )}

      {/* Commission Rates */}
      <Card>
        <CardHeader>
          <CardTitle>플랫폼 수수료율</CardTitle>
          <CardDescription>
            예약 유형별 플랫폼 수수료를 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commission_recommended">추천 예약 수수료 (%)</Label>
              <Input
                id="commission_recommended"
                type="number"
                min="0"
                max="100"
                step="1"
                value={commissionRecommended}
                onChange={(e) => setCommissionRecommended(Number(e.target.value))}
                required
              />
              <p className="text-xs text-muted-foreground">
                관리자가 매칭하는 추천 예약의 수수료 (권장: 15%)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commission_direct">지정 예약 수수료 (%)</Label>
              <Input
                id="commission_direct"
                type="number"
                min="0"
                max="100"
                step="1"
                value={commissionDirect}
                onChange={(e) => setCommissionDirect(Number(e.target.value))}
                required
              />
              <p className="text-xs text-muted-foreground">
                고객이 직접 선택하는 지정 예약의 수수료 (권장: 20%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Duration Discounts */}
      <Card>
        <CardHeader>
          <CardTitle>수업 시간별 할인율</CardTitle>
          <CardDescription>
            수업 시간에 따른 할인율을 설정합니다. 100% = 할인 없음, 90% = 10% 할인
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount_60">60분 (%)</Label>
              <Input
                id="discount_60"
                type="number"
                min="0"
                max="100"
                step="1"
                value={discount60}
                onChange={(e) => setDiscount60(Number(e.target.value))}
                required
              />
              <p className="text-xs text-muted-foreground">
                60분 수업 가격 비율 (권장: 100%)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_90">90분 (%)</Label>
              <Input
                id="discount_90"
                type="number"
                min="0"
                max="100"
                step="1"
                value={discount90}
                onChange={(e) => setDiscount90(Number(e.target.value))}
                required
              />
              <p className="text-xs text-muted-foreground">
                90분 수업 가격 비율 (권장: 95%)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_120">120분 (%)</Label>
              <Input
                id="discount_120"
                type="number"
                min="0"
                max="100"
                step="1"
                value={discount120}
                onChange={(e) => setDiscount120(Number(e.target.value))}
                required
              />
              <p className="text-xs text-muted-foreground">
                120분 수업 가격 비율 (권장: 90%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Prices */}
      <Card>
        <CardHeader>
          <CardTitle>세션 타입별 기본 가격</CardTitle>
          <CardDescription>
            1시간 기준 세션 타입별 인당 가격을 설정합니다. (단위: 원)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_1on1">1:1 세션 (1인)</Label>
              <Input
                id="price_1on1"
                type="number"
                min="0"
                step="1000"
                value={price1on1}
                onChange={(e) => setPrice1on1(Number(e.target.value))}
                required
              />
              <p className="text-xs text-muted-foreground">
                권장: 100,000원
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_2on1">2:1 세션 (1인당)</Label>
              <Input
                id="price_2on1"
                type="number"
                min="0"
                step="1000"
                value={price2on1}
                onChange={(e) => setPrice2on1(Number(e.target.value))}
                required
              />
              <p className="text-xs text-muted-foreground">
                권장: 75,000원
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_3on1">3:1 세션 (1인당)</Label>
              <Input
                id="price_3on1"
                type="number"
                min="0"
                step="1000"
                value={price3on1}
                onChange={(e) => setPrice3on1(Number(e.target.value))}
                required
              />
              <p className="text-xs text-muted-foreground">
                권장: 55,000원
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          취소
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? '저장 중...' : '저장'}
        </Button>
      </div>
    </form>
  )
}
