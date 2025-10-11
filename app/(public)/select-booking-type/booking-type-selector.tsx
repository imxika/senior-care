'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Search, Loader2 } from 'lucide-react'

interface BookingTypeSelectorProps {
  queryString: string
  sessionLabel: string
  serviceType: string
}

export function BookingTypeSelector({ queryString, sessionLabel, serviceType }: BookingTypeSelectorProps) {
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState<'recommended' | 'direct' | null>(null)

  const handleNavigation = (type: 'recommended' | 'direct') => {
    setIsNavigating(type)
    // 'navigationStart' 이벤트 발생
    window.dispatchEvent(new Event('navigationStart'))

    const url = type === 'recommended'
      ? `/booking/recommended${queryString}`
      : `/trainers${queryString}`

    router.push(url)
  }

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
            <Button
              className="w-full"
              size="lg"
              onClick={() => handleNavigation('recommended')}
              disabled={isNavigating !== null}
            >
              {isNavigating === 'recommended' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  이동 중...
                </>
              ) : (
                '추천 예약하기'
              )}
            </Button>
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
            <Button
              className="w-full"
              size="lg"
              variant="outline"
              onClick={() => handleNavigation('direct')}
              disabled={isNavigating !== null}
            >
              {isNavigating === 'direct' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  이동 중...
                </>
              ) : (
                '트레이너 둘러보기'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
