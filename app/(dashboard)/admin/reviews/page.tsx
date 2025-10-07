import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Star, CheckCircle, AlertCircle } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { SidebarTrigger } from '@/components/ui/sidebar'
import ReviewManagementClient from './ReviewManagementClient'

export default async function AdminReviewsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'admin') redirect('/')

  // Service Role client for RLS bypass (admin access)
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // 모든 리뷰 조회 (Service Role로 RLS 우회)
  const { data: reviews, error } = await serviceSupabase
    .from('reviews')
    .select(`
      *,
      customer:customers!customer_id(
        id,
        profile:profiles!profile_id(full_name, avatar_url)
      ),
      trainer:trainers!trainer_id(
        id,
        profile:profiles!profile_id(full_name, avatar_url)
      ),
      booking:bookings!booking_id(
        id,
        booking_date,
        service_type,
        booking_type
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching reviews:', error)
  }

  // 통계 계산
  const totalReviews = reviews?.length || 0
  const averageRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'
  const reviewsWithResponse = reviews?.filter(r => r.trainer_response)?.length || 0
  const reviewsWithoutResponse = totalReviews - reviewsWithResponse

  // 평점별 분포
  const ratingDistribution = {
    5: reviews?.filter(r => r.rating === 5).length || 0,
    4: reviews?.filter(r => r.rating === 4).length || 0,
    3: reviews?.filter(r => r.rating === 3).length || 0,
    2: reviews?.filter(r => r.rating === 2).length || 0,
    1: reviews?.filter(r => r.rating === 1).length || 0,
  }

  return (
    <>
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>리뷰 관리</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">리뷰 관리</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            모든 리뷰를 조회하고 관리하세요
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 리뷰</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReviews}</div>
              <p className="text-xs text-muted-foreground mt-1">
                전체 리뷰 수
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">평균 평점</CardTitle>
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageRating}</div>
              <p className="text-xs text-muted-foreground mt-1">
                5점 만점
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">답글 작성됨</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{reviewsWithResponse}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalReviews > 0 ? ((reviewsWithResponse / totalReviews) * 100).toFixed(0) : 0}% 응답률
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">답글 대기</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{reviewsWithoutResponse}</div>
              <p className="text-xs text-muted-foreground mt-1">
                답변 필요
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>평점 분포</CardTitle>
            <CardDescription>전체 리뷰의 평점 분포</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{rating}</span>
                  </div>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 transition-all"
                      style={{
                        width: totalReviews > 0
                          ? `${(ratingDistribution[rating as keyof typeof ratingDistribution] / totalReviews) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {ratingDistribution[rating as keyof typeof ratingDistribution]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reviews List - Client Component with Filtering */}
        <ReviewManagementClient reviews={reviews || []} />
      </div>
    </>
  )
}
