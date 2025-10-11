'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { updateTrainerPricing } from './actions'
import { Loader2, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { TrainerPricingConfig, PlatformPricingPolicy } from '@/lib/pricing-utils'

interface TrainerPricingSettingsFormProps {
  trainerId: string
  config: TrainerPricingConfig
  policy: PlatformPricingPolicy
}

export default function TrainerPricingSettingsForm({
  trainerId,
  config,
  policy
}: TrainerPricingSettingsFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Main settings
  const [usePlatformDefault, setUsePlatformDefault] = useState(config.use_platform_default)
  const [acceptRecommended, setAcceptRecommended] = useState(config.accept_recommended)

  // Custom pricing (only shown when not using platform default)
  const [customHourlyRate, setCustomHourlyRate] = useState(config.custom_hourly_rate || policy.session_prices['1:1'])

  // Custom session prices
  const [customPrice1on1, setCustomPrice1on1] = useState(
    config.custom_session_prices?.['1:1'] || policy.session_prices['1:1']
  )
  const [customPrice2on1, setCustomPrice2on1] = useState(
    config.custom_session_prices?.['2:1'] || policy.session_prices['2:1']
  )
  const [customPrice3on1, setCustomPrice3on1] = useState(
    config.custom_session_prices?.['3:1'] || policy.session_prices['3:1']
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData()
    formData.append('trainer_id', trainerId)
    formData.append('use_platform_default', usePlatformDefault.toString())
    formData.append('accept_recommended', acceptRecommended.toString())

    if (!usePlatformDefault) {
      formData.append('custom_hourly_rate', customHourlyRate.toString())
      formData.append('custom_price_1on1', customPrice1on1.toString())
      formData.append('custom_price_2on1', customPrice2on1.toString())
      formData.append('custom_price_3on1', customPrice3on1.toString())
    }

    const result = await updateTrainerPricing(formData)

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
          <p className="text-sm">가격 설정이 성공적으로 업데이트되었습니다.</p>
        </div>
      )}

      {/* Platform Default Setting */}
      <Card>
        <CardHeader>
          <CardTitle>가격 정책 선택</CardTitle>
          <CardDescription>
            플랫폼 기본 가격을 사용하거나 나만의 가격을 설정할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="use_platform_default" className="text-base">
                플랫폼 기본 가격 사용
              </Label>
              <p className="text-sm text-muted-foreground">
                플랫폼이 설정한 기본 가격과 할인 정책을 따릅니다
              </p>
            </div>
            <Switch
              id="use_platform_default"
              checked={usePlatformDefault}
              onCheckedChange={setUsePlatformDefault}
            />
          </div>

          {usePlatformDefault && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1 text-sm">
                  <p><strong>플랫폼 기본 가격:</strong></p>
                  <p>• 1:1 세션: {policy.session_prices['1:1'].toLocaleString()}원/시간</p>
                  <p>• 2:1 세션: {policy.session_prices['2:1'].toLocaleString()}원/시간 (1인당)</p>
                  <p>• 3:1 세션: {policy.session_prices['3:1'].toLocaleString()}원/시간 (1인당)</p>
                  <p className="mt-2"><strong>할인 정책:</strong></p>
                  <p>• 90분 수업: {(100 - policy.duration_discounts['90'] * 100).toFixed(0)}% 할인</p>
                  <p>• 120분 수업: {(100 - policy.duration_discounts['120'] * 100).toFixed(0)}% 할인</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="accept_recommended" className="text-base">
                추천 예약 참여
              </Label>
              <p className="text-sm text-muted-foreground">
                관리자가 매칭하는 추천 예약을 받을 수 있습니다 (수수료 {policy.commission_recommended}%)
              </p>
            </div>
            <Switch
              id="accept_recommended"
              checked={acceptRecommended}
              onCheckedChange={setAcceptRecommended}
            />
          </div>

          {!acceptRecommended && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                추천 예약 참여를 비활성화하면 관리자 매칭 시스템에서 제외됩니다.
                지정 예약만 받을 수 있습니다 (수수료 {policy.commission_direct}%).
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Custom Pricing (only shown when not using platform default) */}
      {!usePlatformDefault && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>커스텀 시급 설정</CardTitle>
              <CardDescription>
                1시간 기준 기본 시급을 설정합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom_hourly_rate">기본 시급 (원)</Label>
                <Input
                  id="custom_hourly_rate"
                  type="number"
                  min="0"
                  step="1000"
                  value={customHourlyRate}
                  onChange={(e) => setCustomHourlyRate(Number(e.target.value))}
                  required={!usePlatformDefault}
                />
                <p className="text-xs text-muted-foreground">
                  플랫폼 기본 시급: {policy.session_prices['1:1'].toLocaleString()}원
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>세션 타입별 가격</CardTitle>
              <CardDescription>
                1시간 기준 세션 타입별 인당 가격을 설정합니다. (단위: 원)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="custom_price_1on1">1:1 세션 (1인)</Label>
                  <Input
                    id="custom_price_1on1"
                    type="number"
                    min="0"
                    step="1000"
                    value={customPrice1on1}
                    onChange={(e) => setCustomPrice1on1(Number(e.target.value))}
                    required={!usePlatformDefault}
                  />
                  <p className="text-xs text-muted-foreground">
                    기본: {policy.session_prices['1:1'].toLocaleString()}원
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom_price_2on1">2:1 세션 (1인당)</Label>
                  <Input
                    id="custom_price_2on1"
                    type="number"
                    min="0"
                    step="1000"
                    value={customPrice2on1}
                    onChange={(e) => setCustomPrice2on1(Number(e.target.value))}
                    required={!usePlatformDefault}
                  />
                  <p className="text-xs text-muted-foreground">
                    기본: {policy.session_prices['2:1'].toLocaleString()}원
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom_price_3on1">3:1 세션 (1인당)</Label>
                  <Input
                    id="custom_price_3on1"
                    type="number"
                    min="0"
                    step="1000"
                    value={customPrice3on1}
                    onChange={(e) => setCustomPrice3on1(Number(e.target.value))}
                    required={!usePlatformDefault}
                  />
                  <p className="text-xs text-muted-foreground">
                    기본: {policy.session_prices['3:1'].toLocaleString()}원
                  </p>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  커스텀 가격을 설정해도 플랫폼의 시간별 할인 정책은 동일하게 적용됩니다.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </>
      )}

      <Separator />

      {/* Commission Info */}
      <Card>
        <CardHeader>
          <CardTitle>수수료 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">추천 예약 수수료:</span>
              <span className="font-medium">{policy.commission_recommended}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">지정 예약 수수료:</span>
              <span className="font-medium">{policy.commission_direct}%</span>
            </div>
            <Separator className="my-2" />
            <p className="text-xs text-muted-foreground">
              수수료는 예약 금액에서 자동으로 차감되며, 트레이너 정산 시 반영됩니다.
            </p>
          </div>
        </CardContent>
      </Card>

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
