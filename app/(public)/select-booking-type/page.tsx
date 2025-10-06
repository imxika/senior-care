import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Search } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{
    session?: string
    service?: string
  }>
}

export default async function SelectBookingTypePage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const search = await searchParams

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Not logged in - redirect to login with return path
    const params = new URLSearchParams()
    if (search.session) params.set('session', search.session)
    if (search.service) params.set('service', search.service)

    redirect(`/login?redirect=/select-booking-type${params.toString() ? `?${params.toString()}` : ''}`)
  }

  // Build query params for next pages
  const queryParams = new URLSearchParams()
  if (search.session) queryParams.set('session', search.session)
  if (search.service) queryParams.set('service', search.service)
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''

  // Get user's display preferences from URL
  const sessionType = search.session || '1:1'
  const serviceType = search.service === 'home' ? '방문 서비스' : search.service === 'center' ? '센터 방문' : '서비스'
  const sessionLabel = sessionType === '1:1' ? '1:1 개인' : sessionType === '2:1' ? '2:1 소그룹' : '3:1 소그룹'

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">예약 방식을 선택하세요</h1>
        <p className="text-muted-foreground">
          {sessionLabel} {serviceType}를 선택하셨습니다
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 추천 예약 */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>추천 예약</CardTitle>
            <CardDescription className="min-h-[60px]">
              관리자가 귀하의 상황에 가장 적합한 트레이너를 매칭해드립니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>거리와 전문분야를 고려한 최적 매칭</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>관리자의 전문적인 추천</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>기본 요금 적용</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>매칭 후 트레이너 정보 확인 가능</span>
              </li>
            </ul>
            <Link href={`/booking/recommended${queryString}`} className="block">
              <Button className="w-full" size="lg">
                추천 예약하기
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* 트레이너 지정 */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>트레이너 지정</CardTitle>
            <CardDescription className="min-h-[60px]">
              원하는 트레이너를 직접 선택하여 예약합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>트레이너 프로필 상세 확인</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>리뷰와 평점 확인 가능</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>원하는 트레이너와 즉시 매칭</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>트레이너별 가용 시간 확인</span>
              </li>
            </ul>
            <Link href={`/trainers${queryString}`} className="block">
              <Button className="w-full" size="lg" variant="outline">
                트레이너 둘러보기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← 처음으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
