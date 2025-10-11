'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowUpRight, Sparkles, Search, Calendar, Star } from 'lucide-react'
import NProgress from 'nprogress'

interface DashboardActionCardsProps {
  bookingForReview: { id: string } | null
}

export function DashboardActionCards({ bookingForReview }: DashboardActionCardsProps) {
  const router = useRouter()

  const handleNavigation = (path: string) => {
    NProgress.start()
    router.push(path)
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:gap-5">
      {/* 추천 예약 카드 */}
      <Card className="hover:shadow-lg transition-all hover:border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-2">
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900">
              <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl md:text-2xl">추천 예약</CardTitle>
              <CardDescription className="text-base md:text-lg mt-1">AI 맞춤 트레이너 매칭</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <Button
            onClick={() => handleNavigation('/booking/recommended')}
            className="w-full bg-purple-600 hover:bg-purple-700 h-14 text-lg"
          >
            시작하기
            <ArrowUpRight className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>

      {/* 트레이너 찾기 카드 */}
      <Card className="hover:shadow-lg transition-all hover:border-primary border-2">
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl md:text-2xl">트레이너 찾기</CardTitle>
              <CardDescription className="text-base md:text-lg mt-1">직접 트레이너 선택</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <Button
            onClick={() => handleNavigation('/trainers')}
            variant="outline"
            className="w-full h-14 text-lg border-2"
          >
            검색하기
            <ArrowUpRight className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>

      {/* 내 예약 카드 */}
      <Card className="hover:shadow-lg transition-all hover:border-primary border-2">
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900">
              <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl md:text-2xl">내 예약</CardTitle>
              <CardDescription className="text-base md:text-lg mt-1">예약 내역 확인</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <Button
            onClick={() => handleNavigation('/customer/bookings')}
            variant="outline"
            className="w-full h-14 text-lg border-2"
          >
            보기
            <ArrowUpRight className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>

      {/* 리뷰 작성 카드 */}
      <Card className="hover:shadow-lg transition-all hover:border-primary border-2">
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-900">
              <Star className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl md:text-2xl">리뷰 작성</CardTitle>
              <CardDescription className="text-base md:text-lg mt-1">
                {bookingForReview ? '작성 대기 중' : '내 리뷰 보기'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {bookingForReview ? (
            <Button
              onClick={() => handleNavigation(`/customer/bookings/${bookingForReview.id}`)}
              variant="outline"
              className="w-full h-14 text-lg border-2"
            >
              작성하기
              <ArrowUpRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button
              onClick={() => handleNavigation('/customer/reviews')}
              variant="outline"
              className="w-full h-14 text-lg border-2"
            >
              보기
              <ArrowUpRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
