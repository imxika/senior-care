'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface TrainerReviewResponseProps {
  reviewId: string
  existingResponse: string | null
}

export function TrainerReviewResponse({ reviewId, existingResponse }: TrainerReviewResponseProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [response, setResponse] = useState(existingResponse || '')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    if (!response.trim() && !existingResponse) {
      toast.error('답글 내용을 입력해주세요')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch(`/api/reviews/${reviewId}/response`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: response.trim() || null }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '답글 저장에 실패했습니다')
      }

      toast.success(existingResponse ? '답글이 수정되었습니다' : '답글이 등록되었습니다')
      setIsEditing(false)
      router.refresh()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '오류가 발생했습니다';
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('답글을 삭제하시겠습니까?')) return

    setIsLoading(true)

    try {
      const res = await fetch(`/api/reviews/${reviewId}/response`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '답글 삭제에 실패했습니다')
      }

      toast.success('답글이 삭제되었습니다')
      setResponse('')
      setIsEditing(false)
      router.refresh()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '오류가 발생했습니다';
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setResponse(existingResponse || '')
    setIsEditing(false)
  }

  if (!isEditing && existingResponse) {
    return (
      <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-start justify-between mb-1">
          <p className="text-xs font-medium text-muted-foreground">트레이너 답글</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-6 text-xs px-2"
          >
            수정
          </Button>
        </div>
        <p className="text-sm whitespace-pre-wrap">{existingResponse}</p>
      </div>
    )
  }

  if (!isEditing && !existingResponse) {
    return (
      <div className="mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="h-8 text-xs"
        >
          답글 작성
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      <Textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="고객에게 감사 인사를 전하거나 피드백에 답변해주세요"
        rows={3}
        className="resize-none text-sm"
      />
      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          size="sm"
          className="h-8 text-xs"
        >
          {isLoading ? '저장 중...' : '저장'}
        </Button>
        <Button
          onClick={handleCancel}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="h-8 text-xs"
        >
          취소
        </Button>
        {existingResponse && (
          <Button
            onClick={handleDelete}
            disabled={isLoading}
            variant="destructive"
            size="sm"
            className="h-8 text-xs ml-auto"
          >
            삭제
          </Button>
        )}
      </div>
    </div>
  )
}
