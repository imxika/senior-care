import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, MessageSquare } from 'lucide-react'
import { TrainerReviewResponse } from '@/components/trainer-review-response'
import Link from 'next/link'

export default async function TrainerReviewsPage() {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 프로필 정보 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'trainer') {
    redirect('/trainer/dashboard')
  }

  // 트레이너 정보 조회
  const { data: trainer } = await supabase
    .from('trainers')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  if (!trainer) {
    redirect('/trainer/dashboard')
  }

  // 리뷰 목록 조회 (예약 정보 포함)
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      *,
      customer:customers(
        profiles!customers_profile_id_fkey(
          full_name,
          avatar_url
        )
      ),
      booking:bookings(
        id,
        booking_date,
        start_time,
        service_type,
        service_completed_at
      )
    `)
    .eq('trainer_id', trainer.id)
    .order('created_at', { ascending: false })

  // 통계 계산
  const totalReviews = reviews?.length || 0
  const averageRating = trainer.average_rating || 0
  const reviewsWithResponse = reviews?.filter(r => r.trainer_response)?.length || 0
  const reviewsWithoutResponse = totalReviews - reviewsWithResponse

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/trainer/dashboard">트레이너</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>리뷰 관리</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 p-4 md:gap-6 md:p-6">
        {/* 제목 */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">리뷰 관리</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            고객들이 작성한 리뷰를 확인하고 답글을 작성하세요
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">평균 평점</CardDescription>
              <CardTitle className="text-2xl md:text-3xl flex items-center gap-2">
                <Star className="h-5 w-5 md:h-6 md:w-6 fill-yellow-400 text-yellow-400" />
                {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">총 리뷰</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">{totalReviews}개</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">답글 완료</CardDescription>
              <CardTitle className="text-2xl md:text-3xl text-green-600">
                {reviewsWithResponse}개
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">답글 대기</CardDescription>
              <CardTitle className="text-2xl md:text-3xl text-orange-600">
                {reviewsWithoutResponse}개
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 리뷰 목록 */}
        <div className="grid gap-3 md:gap-4">
          {reviews && reviews.length > 0 ? (
            reviews.map((review) => (
              <Card key={review.id}>
                <CardHeader className="px-4 md:px-6 pt-4 md:pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base md:text-lg">
                          {review.customer?.profiles?.full_name || '익명'}
                        </CardTitle>
                        {!review.trainer_response && (
                          <Badge variant="outline" className="text-xs">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            답글 대기
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 md:h-4 md:w-4 ${
                                star <= review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                    {review.booking && (
                      <Link
                        href={`/trainer/bookings/${review.booking.id}`}
                        className="text-xs md:text-sm text-blue-600 hover:underline whitespace-nowrap"
                      >
                        예약 보기 →
                      </Link>
                    )}
                  </div>
                  {review.booking && (
                    <CardDescription className="text-xs md:text-sm mt-2">
                      {review.booking.service_type} • {new Date(review.booking.booking_date).toLocaleDateString('ko-KR')} {review.booking.start_time}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
                  {review.comment && (
                    <p className="text-sm md:text-base text-muted-foreground whitespace-pre-wrap mb-3">
                      {review.comment}
                    </p>
                  )}
                  <TrainerReviewResponse
                    reviewId={review.id}
                    existingResponse={review.trainer_response}
                  />
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Star className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-sm md:text-base text-muted-foreground">
                  아직 받은 리뷰가 없습니다
                </p>
                <p className="text-xs md:text-sm text-muted-foreground mt-2">
                  서비스를 완료하면 고객이 리뷰를 작성할 수 있습니다
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
