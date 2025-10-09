import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Star } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default async function CustomerReviewsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/signin')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'customer') {
    redirect('/customer/dashboard')
  }

  // 고객 정보 확인
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!customer) {
    redirect('/customer/dashboard')
  }

  // 리뷰 목록 조회
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      *,
      booking:bookings(
        id,
        booking_date,
        start_time,
        service_type
      ),
      trainer:trainers(
        id,
        profiles!trainers_profile_id_fkey(
          full_name,
          avatar_url
        )
      )
    `)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })

  const formatDate = (date: string) => {
    const d = new Date(date)
    const month = d.getMonth() + 1
    const day = d.getDate()
    return `${month}.${day}`
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/customer/dashboard">
                  고객
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>리뷰</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-6 lg:gap-8 lg:p-8 max-w-[1400px] mx-auto w-full">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">내 리뷰</h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            작성한 리뷰를 확인하고 관리하세요
          </p>
        </div>

        {reviews && reviews.length > 0 ? (
          <div className="grid gap-5">
            {reviews.map((review: any) => (
              <Card key={review.id} className="border-2">
                <CardHeader className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-6 w-6 md:h-7 md:w-7 ${
                                star <= review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-lg md:text-xl font-medium">
                          {review.rating}.0
                        </span>
                      </div>
                      <p className="text-base md:text-lg text-muted-foreground">
                        {review.booking?.booking_date && `${formatDate(review.booking.booking_date)} 예약`}
                      </p>
                    </div>
                    <Link href={`/customer/bookings/${review.booking_id}`}>
                      <Badge variant="outline" className="text-base px-3 py-1">
                        예약 보기
                      </Badge>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-5">
                  {review.comment && (
                    <div>
                      <p className="text-base md:text-lg whitespace-pre-wrap leading-relaxed">
                        {review.comment}
                      </p>
                      <p className="text-base text-muted-foreground mt-3">
                        {new Date(review.created_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}

                  {/* 트레이너 답글 - 시니어 친화적 */}
                  {review.trainer_response && (
                    <div className="pt-4 border-t-2">
                      <div className="bg-muted/50 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <MessageSquare className="h-5 w-5 text-primary" />
                          <p className="text-base md:text-lg font-medium text-primary">
                            {review.trainer?.profiles?.full_name || '트레이너'} 답글
                          </p>
                        </div>
                        <p className="text-base md:text-lg whitespace-pre-wrap text-foreground leading-relaxed">
                          {review.trainer_response}
                        </p>
                        {review.trainer_response_at && (
                          <p className="text-base text-muted-foreground mt-3">
                            {new Date(review.trainer_response_at).toLocaleDateString('ko-KR', {
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
            ))}
          </div>
        ) : (
          <Card className="border-2">
            <CardContent className="flex flex-col items-center justify-center py-16 px-6">
              <div className="rounded-full bg-muted p-8 mb-6">
                <MessageSquare className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground" />
              </div>
              <h3 className="text-2xl md:text-3xl font-semibold mb-3">아직 작성한 리뷰가 없습니다</h3>
              <p className="text-lg md:text-xl text-muted-foreground text-center max-w-md">
                서비스 완료 후 트레이너에 대한 리뷰를 작성할 수 있습니다
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
