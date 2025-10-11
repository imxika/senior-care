'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingButton } from '@/components/ui/loading-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CreditCard, AlertCircle } from 'lucide-react'
import { updateBillingInfo } from './actions'

interface BillingFormProps {
  trainer: {
    id: string
    bank_name?: string | null
    account_number?: string | null
    account_holder_name?: string | null
    business_registration_number?: string | null
    is_business?: boolean
  }
}

const BANKS = [
  'KB국민은행',
  '신한은행',
  '우리은행',
  'NH농협은행',
  '하나은행',
  'IBK기업은행',
  'SC제일은행',
  '한국씨티은행',
  '케이뱅크',
  '카카오뱅크',
  '토스뱅크',
  '새마을금고',
  '신협',
  '우체국',
  '기타',
]

export function BillingForm({ trainer }: BillingFormProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [bankName, setBankName] = useState(trainer.bank_name ?? '')
  const [accountNumber, setAccountNumber] = useState(trainer.account_number ?? '')
  const [accountHolderName, setAccountHolderName] = useState(trainer.account_holder_name ?? '')
  const [isBusiness, setIsBusiness] = useState(trainer.is_business ?? false)
  const [businessNumber, setBusinessNumber] = useState(trainer.business_registration_number ?? '')

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // 유효성 검사
    if (!bankName) {
      setError('은행을 선택해주세요')
      setIsLoading(false)
      return
    }

    if (!accountNumber) {
      setError('계좌번호를 입력해주세요')
      setIsLoading(false)
      return
    }

    if (!accountHolderName) {
      setError('예금주명을 입력해주세요')
      setIsLoading(false)
      return
    }

    if (isBusiness && !businessNumber) {
      setError('사업자 등록번호를 입력해주세요')
      setIsLoading(false)
      return
    }

    const formData = new FormData()
    formData.append('bank_name', bankName)
    formData.append('account_number', accountNumber.replace(/[^0-9]/g, ''))
    formData.append('account_holder_name', accountHolderName)
    formData.append('is_business', isBusiness.toString())
    formData.append('business_registration_number', businessNumber.replace(/[^0-9]/g, ''))

    const result = await updateBillingInfo(formData)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      setIsLoading(false)
      router.refresh()
    }
  }

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <CreditCard className="h-5 w-5" />
            정산 계좌 정보
          </CardTitle>
          <CardDescription className="text-sm">
            수입 정산을 받을 계좌 정보를 입력해주세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader className="px-4 md:px-6 pt-4 md:pt-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <CreditCard className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
            정산 계좌 정보
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            수입 정산을 받을 계좌 정보를 입력해주세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6 px-4 md:px-6 pb-4 md:pb-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* 은행 선택 */}
          <div className="space-y-2">
            <Label htmlFor="bank_name" className="text-sm md:text-base">은행</Label>
            <select
              id="bank_name"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="flex h-12 md:h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            >
              <option value="">은행 선택</option>
              {BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>

          {/* 계좌번호 */}
          <div className="space-y-2">
            <Label htmlFor="account_number" className="text-sm md:text-base">계좌번호</Label>
            <Input
              id="account_number"
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="- 없이 숫자만 입력"
              className="h-12 md:h-11 text-base md:text-base"
              required
            />
          </div>

          {/* 예금주명 */}
          <div className="space-y-2">
            <Label htmlFor="account_holder_name" className="text-sm md:text-base">예금주명</Label>
            <Input
              id="account_holder_name"
              type="text"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              placeholder="예금주 이름"
              className="h-12 md:h-11 text-base md:text-base"
              required
            />
          </div>

          {/* 사업자 여부 */}
          <div className="flex items-center justify-between p-3 md:p-4 border rounded-lg bg-muted/30">
            <div className="space-y-0.5 flex-1 pr-2">
              <Label htmlFor="is_business" className="text-sm md:text-base font-medium">
                사업자 등록
              </Label>
              <p className="text-xs md:text-sm text-muted-foreground">
                사업자로 등록된 경우 선택해주세요
              </p>
            </div>
            <Switch
              id="is_business"
              checked={isBusiness}
              onCheckedChange={setIsBusiness}
            />
          </div>

          {/* 사업자 등록번호 (조건부) */}
          {isBusiness && (
            <div className="space-y-2">
              <Label htmlFor="business_number" className="text-sm md:text-base">
                사업자 등록번호
              </Label>
              <Input
                id="business_number"
                type="text"
                value={businessNumber}
                onChange={(e) => setBusinessNumber(e.target.value)}
                placeholder="000-00-00000"
                className="h-12 md:h-11 text-base md:text-base"
                required={isBusiness}
              />
              <p className="text-xs text-muted-foreground">
                - 없이 숫자만 입력해주세요
              </p>
            </div>
          )}

          {/* 저장 버튼 */}
          <div
            className="flex gap-2 md:gap-3 sticky bottom-4 p-3 md:p-4 rounded-lg border shadow-lg"
            style={{
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              backgroundColor: 'rgba(255, 255, 255, 0.4)'
            }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
              className="flex-1 h-11 md:h-12 md:flex-none md:min-w-[100px]"
            >
              취소
            </Button>
            <LoadingButton
              type="submit"
              loading={isLoading}
              loadingText="저장 중..."
              className="flex-1 h-11 md:h-12 md:flex-none md:min-w-[120px]"
            >
              저장
            </LoadingButton>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
