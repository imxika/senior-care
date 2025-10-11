'use client'

import { Fragment, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Star, MessageSquare, AlertCircle, Search, Eye, EyeOff, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Review {
  id: string
  rating: number
  comment: string | null
  trainer_response: string | null
  trainer_response_at: string | null
  created_at: string
  is_hidden: boolean
  images?: string[] | null
  videos?: string[] | null
  customer?: {
    id: string
    profile?: {
      full_name?: string
      avatar_url?: string
    }
  }
  trainer?: {
    id: string
    profile?: {
      full_name?: string
      avatar_url?: string
    }
  }
  booking?: {
    id: string
    booking_date: string
    service_type: string
    booking_type: string
  }
}

interface Props {
  reviews: Review[]
}

export default function ReviewManagementClient({ reviews: initialReviews }: Props) {
  const [reviews, setReviews] = useState(initialReviews)
  const [searchTerm, setSearchTerm] = useState('')
  const [ratingFilter, setRatingFilter] = useState<string>('all')
  const [responseFilter, setResponseFilter] = useState<string>('all')
  const [hiddenFilter, setHiddenFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'rating'>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; reviewId: string | null }>({
    open: false,
    reviewId: null,
  })
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const toggleRow = (reviewId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId)
    } else {
      newExpanded.add(reviewId)
    }
    setExpandedRows(newExpanded)
  }

  const handleSort = (column: 'created_at' | 'rating') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (column: 'created_at' | 'rating') => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 opacity-30" />
    }
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const handleToggleHide = async (reviewId: string, currentHiddenState: boolean) => {
    setIsLoading(reviewId)
    try {
      const response = await fetch('/api/admin/reviews/toggle-hidden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, isHidden: !currentHiddenState }),
      })

      if (!response.ok) throw new Error('Failed to toggle visibility')

      setReviews(reviews.map(r =>
        r.id === reviewId ? { ...r, is_hidden: !currentHiddenState } : r
      ))

      toast.success(
        !currentHiddenState ? '리뷰가 숨겨졌습니다' : '리뷰가 다시 표시됩니다',
        { description: !currentHiddenState ? '고객과 트레이너 페이지에서 보이지 않습니다' : '고객과 트레이너 페이지에서 표시됩니다' }
      )
    } catch {
      toast.error('처리 중 오류가 발생했습니다')
    } finally {
      setIsLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.reviewId) return

    setIsLoading(deleteDialog.reviewId)
    try {
      const response = await fetch('/api/admin/reviews/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: deleteDialog.reviewId }),
      })

      if (!response.ok) throw new Error('Failed to delete review')

      setReviews(reviews.filter(r => r.id !== deleteDialog.reviewId))
      setDeleteDialog({ open: false, reviewId: null })

      toast.success('리뷰가 삭제되었습니다', {
        description: '복구할 수 없습니다'
      })
    } catch {
      toast.error('삭제 중 오류가 발생했습니다')
    } finally {
      setIsLoading(null)
    }
  }

  // 필터링 & 정렬
  const filteredReviews = reviews.filter(review => {
    // 검색
    if (searchTerm) {
      const customerName = review.customer?.profile?.full_name?.toLowerCase() || ''
      const trainerName = review.trainer?.profile?.full_name?.toLowerCase() || ''
      const comment = review.comment?.toLowerCase() || ''
      const searchLower = searchTerm.toLowerCase()

      if (!customerName.includes(searchLower) &&
          !trainerName.includes(searchLower) &&
          !comment.includes(searchLower)) {
        return false
      }
    }

    // 평점 필터
    if (ratingFilter !== 'all' && review.rating !== parseInt(ratingFilter)) {
      return false
    }

    // 답글 필터
    if (responseFilter === 'with' && !review.trainer_response) {
      return false
    }
    if (responseFilter === 'without' && review.trainer_response) {
      return false
    }

    // 숨김 필터
    if (hiddenFilter === 'visible' && review.is_hidden) {
      return false
    }
    if (hiddenFilter === 'hidden' && !review.is_hidden) {
      return false
    }

    return true
  })

  // 정렬
  filteredReviews.sort((a, b) => {
    let comparison = 0

    if (sortBy === 'created_at') {
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    } else if (sortBy === 'rating') {
      comparison = a.rating - b.rating
    }

    return sortDirection === 'asc' ? comparison : -comparison
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="고객명, 트레이너명, 내용 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Rating Filter */}
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-full md:w-[140px]">
                <SelectValue placeholder="평점" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 평점</SelectItem>
                <SelectItem value="5">★ 5점</SelectItem>
                <SelectItem value="4">★ 4점</SelectItem>
                <SelectItem value="3">★ 3점</SelectItem>
                <SelectItem value="2">★ 2점</SelectItem>
                <SelectItem value="1">★ 1점</SelectItem>
              </SelectContent>
            </Select>

            {/* Response Filter */}
            <Select value={responseFilter} onValueChange={setResponseFilter}>
              <SelectTrigger className="w-full md:w-[140px]">
                <SelectValue placeholder="답글 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 답글</SelectItem>
                <SelectItem value="with">답글 있음</SelectItem>
                <SelectItem value="without">답글 없음</SelectItem>
              </SelectContent>
            </Select>

            {/* Hidden Filter */}
            <Select value={hiddenFilter} onValueChange={setHiddenFilter}>
              <SelectTrigger className="w-full md:w-[140px]">
                <SelectValue placeholder="표시 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="visible">표시됨</SelectItem>
                <SelectItem value="hidden">숨김</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">정렬:</span>
        <Button
          variant={sortBy === 'created_at' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleSort('created_at')}
          className="gap-1"
        >
          작성일 {getSortIcon('created_at')}
        </Button>
        <Button
          variant={sortBy === 'rating' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleSort('rating')}
          className="gap-1"
        >
          평점 {getSortIcon('rating')}
        </Button>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">전체 리뷰</h2>
        <span className="text-sm text-muted-foreground">
          {filteredReviews.length}개의 리뷰
        </span>
      </div>

      {/* Reviews Table */}
      {filteredReviews.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium">고객</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">평점</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">내용</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">트레이너</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">답글</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">작성일</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">상태</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredReviews.map((review) => {
                    const isExpanded = expandedRows.has(review.id)

                    return (
                      <Fragment key={review.id}>
                        <tr
                          onClick={() => toggleRow(review.id)}
                          className={`hover:bg-muted/50 cursor-pointer ${review.is_hidden ? 'opacity-60' : ''}`}
                        >
                          {/* Customer */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={review.customer?.profile?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {review.customer?.profile?.full_name?.charAt(0) || 'C'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">
                                {review.customer?.profile?.full_name || '익명'}
                              </span>
                            </div>
                          </td>

                          {/* Rating */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{review.rating}</span>
                            </div>
                          </td>

                          {/* Comment */}
                          <td className="px-4 py-3 max-w-md">
                            <p className="text-sm line-clamp-2">
                              {review.comment || '-'}
                            </p>
                          </td>

                          {/* Trainer */}
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={review.trainer?.profile?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {review.trainer?.profile?.full_name?.charAt(0) || 'T'}
                                </AvatarFallback>
                              </Avatar>
                              <Link
                                href={`/trainers/${review.trainer?.id}`}
                                className="text-sm font-medium hover:text-primary hover:underline"
                              >
                                {review.trainer?.profile?.full_name || '트레이너'}
                              </Link>
                            </div>
                          </td>

                          {/* Response */}
                          <td className="px-4 py-3">
                            {review.trainer_response ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <MessageSquare className="h-4 w-4" />
                                <span className="text-xs">답글 있음</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-orange-600">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-xs">대기 중</span>
                              </div>
                            )}
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(review.created_at).toLocaleDateString('ko-KR', {
                              year: '2-digit',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            {review.is_hidden ? (
                              <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">
                                <EyeOff className="h-3 w-3 mr-1" />
                                숨김
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs border-green-200 text-green-700">
                                <Eye className="h-3 w-3 mr-1" />
                                표시
                              </Badge>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleHide(review.id, review.is_hidden)}
                                disabled={isLoading === review.id}
                                className="h-8 px-2"
                              >
                                {review.is_hidden ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteDialog({ open: true, reviewId: review.id })}
                                disabled={!!loading}
                                className="h-8 px-2 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Row - 전체 내용 표시 */}
                        {isExpanded && (
                          <tr key={`${review.id}-expanded`} className="bg-muted/30">
                            <td colSpan={8} className="px-4 py-4">
                              <div className="space-y-4 max-w-4xl">
                                {/* 전체 리뷰 내용 */}
                                {review.comment && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm font-medium">리뷰 내용</span>
                                    </div>
                                    <p className="text-sm leading-relaxed pl-6">
                                      {review.comment}
                                    </p>
                                  </div>
                                )}

                                {/* 트레이너 답글 */}
                                {review.trainer_response && (
                                  <div className="bg-primary/5 border-l-2 border-primary rounded-r-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <MessageSquare className="h-4 w-4 text-primary" />
                                      <span className="text-sm font-medium text-primary">트레이너 답글</span>
                                      {review.trainer_response_at && (
                                        <span className="text-xs text-muted-foreground ml-auto">
                                          {new Date(review.trainer_response_at).toLocaleDateString('ko-KR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm leading-relaxed">
                                      {review.trainer_response}
                                    </p>
                                  </div>
                                )}

                                {/* 예약 정보 */}
                                {review.booking && (
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <Link
                                      href={`/admin/bookings/${review.booking.id}`}
                                      className="hover:text-primary transition-colors hover:underline font-medium"
                                    >
                                      예약 보기 →
                                    </Link>
                                    <Badge variant="outline" className="text-xs">
                                      {review.booking.booking_type === 'direct' ? '지정 예약' : '추천 예약'}
                                    </Badge>
                                    <span>
                                      {new Date(review.booking.booking_date).toLocaleDateString('ko-KR')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {searchTerm || ratingFilter !== 'all' || responseFilter !== 'all'
                ? '검색 조건에 맞는 리뷰가 없습니다.'
                : '아직 리뷰가 없습니다.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => {
        if (!loading) setDeleteDialog({ open, reviewId: deleteDialog.reviewId })
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>리뷰 삭제</DialogTitle>
            <DialogDescription>
              이 리뷰를 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, reviewId: null })}
              disabled={!!isLoading}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!!isLoading}
            >
              {isLoading ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
