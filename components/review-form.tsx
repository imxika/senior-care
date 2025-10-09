'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

interface ReviewFormProps {
  bookingId: string
  trainerId: string
  existingReview?: {
    id: string
    rating: number
    comment: string
    trainer_response?: string | null
    trainer_response_at?: string | null
    trainer?: {
      id: string
      profiles?: {
        full_name?: string
      }
    }
  } | null
}

export function ReviewForm({ bookingId, trainerId, existingReview }: ReviewFormProps) {
  const router = useRouter()
  const [rating, setRating] = useState(existingReview?.rating || 0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState(existingReview?.comment || '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      toast.error('평점을 선택해주세요')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/reviews', {
        method: existingReview ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          trainerId,
          rating,
          comment,
          reviewId: existingReview?.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '리뷰 저장에 실패했습니다')
      }

      toast.success(existingReview ? '리뷰가 수정되었습니다' : '리뷰가 등록되었습니다')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!existingReview) return
    if (!confirm('리뷰를 삭제하시겠습니까?')) return

    setLoading(true)

    try {
      const response = await fetch('/api/reviews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: existingReview.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '리뷰 삭제에 실패했습니다')
      }

      toast.success('리뷰가 삭제되었습니다')
      setRating(0)
      setComment('')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="lg:p-2">
      <CardHeader className="px-4 lg:px-6 pt-4 lg:pt-6">
        <CardTitle className="text-base lg:text-2xl">
          {existingReview ? '내 리뷰' : '리뷰 작성'}
        </CardTitle>
        <CardDescription className="text-xs lg:text-sm">
          {existingReview ? '작성한 리뷰를 수정하거나 삭제할 수 있습니다' : '서비스 경험을 공유해주세요'}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 lg:px-6 pb-4 lg:pb-6">
        <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
          {/* 별점 */}
          <div className="space-y-2">
            <label className="text-sm lg:text-base font-medium">평점</label>
            <div className="flex gap-1 lg:gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 lg:h-10 lg:w-10 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* 코멘트 */}
          <div className="space-y-2">
            <label htmlFor="comment" className="text-sm lg:text-base font-medium">
              리뷰 내용 (선택)
            </label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="트레이너와의 경험을 자유롭게 작성해주세요"
              rows={4}
              className="resize-none text-sm lg:text-base"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 lg:gap-3">
            <Button
              type="submit"
              disabled={loading || rating === 0}
              className="flex-1 h-10 lg:h-12 text-sm lg:text-base"
            >
              {loading ? '저장 중...' : existingReview ? '수정' : '등록'}
            </Button>
            {existingReview && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
                className="h-10 lg:h-12 text-sm lg:text-base"
              >
                삭제
              </Button>
            )}
          </div>
        </form>

        {/* 트레이너 답글 표시 */}
        {existingReview?.trainer_response && (
          <div className="mt-4 lg:mt-6 pt-4 lg:pt-6 border-t">
            <div className="bg-muted/50 rounded-lg p-3 lg:p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <p className="text-xs lg:text-sm font-medium text-primary">
                  {existingReview?.trainer?.profiles?.full_name || '트레이너'} 답글
                </p>
              </div>
              <p className="text-sm lg:text-base whitespace-pre-wrap text-foreground">
                {existingReview.trainer_response}
              </p>
              {existingReview.trainer_response_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(existingReview.trainer_response_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
