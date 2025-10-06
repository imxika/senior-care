'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { becomeTrainer } from '@/app/(dashboard)/customer/become-trainer/actions'

interface BecomeTrainerFormProps {
  userId: string
}

export function BecomeTrainerForm({ userId }: BecomeTrainerFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!confirmed) {
      setError('트레이너 전환에 동의해주세요.')
      return
    }

    setLoading(true)
    setError(null)

    const result = await becomeTrainer(userId)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      // 성공 시 트레이너 대시보드로 리다이렉트
      router.push('/trainer')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 확인 체크박스 */}
      <div className="space-y-4">
        <Alert>
          <AlertDescription className="text-base">
            <strong className="block mb-2 text-base">트레이너 전환 안내</strong>
            <ul className="space-y-2 text-base text-muted-foreground">
              <li>• 트레이너로 전환하시면 고객 계정 기능은 그대로 유지됩니다.</li>
              <li>• 언제든지 트레이너 서비스를 중단하고 고객 계정으로 돌아갈 수 있습니다.</li>
              <li>• MVP 기간 동안 신청 즉시 승인됩니다.</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/30">
          <Checkbox
            id="confirm"
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
            className="mt-0.5 h-5 w-5"
          />
          <Label
            htmlFor="confirm"
            className="text-base font-medium leading-relaxed cursor-pointer"
          >
            위 내용을 확인했으며, 트레이너로 전환하는 것에 동의합니다.
          </Label>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-base">{error}</AlertDescription>
        </Alert>
      )}

      {/* 제출 버튼 */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
          className="flex-1 h-11"
        >
          취소
        </Button>
        <Button
          type="submit"
          disabled={loading || !confirmed}
          className="flex-1 h-11"
        >
          {loading ? '처리 중...' : '트레이너로 전환하기'}
        </Button>
      </div>
    </form>
  )
}
