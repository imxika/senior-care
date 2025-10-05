'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { updateTrainerNotes } from './actions'
import { FileText, Save, Loader2 } from 'lucide-react'

interface TrainerNotesFormProps {
  bookingId: string
  initialNotes?: string | null
  initialSummary?: string | null
}

export function TrainerNotesForm({ bookingId, initialNotes, initialSummary }: TrainerNotesFormProps) {
  const router = useRouter()
  const [notes, setNotes] = useState(initialNotes || '')
  const [summary, setSummary] = useState(initialSummary || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData()
    formData.append('booking_id', bookingId)
    formData.append('trainer_notes', notes)
    formData.append('session_summary', summary)

    const result = await updateTrainerNotes(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      router.refresh()

      // 성공 메시지 3초 후 자동 숨김
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 트레이너 메모 */}
      <div className="space-y-2">
        <Label htmlFor="trainer_notes" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          트레이너 메모 (나만 볼 수 있음)
        </Label>
        <Textarea
          id="trainer_notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="이 고객에 대한 개인적인 메모를 작성하세요. 특이사항, 주의할 점 등을 기록할 수 있습니다."
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          이 메모는 트레이너 본인만 볼 수 있습니다.
        </p>
      </div>

      {/* 세션 요약 */}
      <div className="space-y-2">
        <Label htmlFor="session_summary" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          세션 요약 (향후 고객과 공유 가능)
        </Label>
        <Textarea
          id="session_summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="오늘 세션에서 진행한 내용을 요약하세요. 나중에 고객과 공유할 수 있습니다."
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          향후 운동 일지 기능에서 고객과 공유될 수 있습니다.
        </p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* 성공 메시지 */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700">메모가 저장되었습니다.</p>
        </div>
      )}

      {/* 저장 버튼 */}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            저장 중...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            메모 저장
          </>
        )}
      </Button>
    </form>
  )
}
