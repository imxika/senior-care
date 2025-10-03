'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Dumbbell, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SelectTypePage() {
  const router = useRouter()
  const supabase = createClient()
  const [selectedType, setSelectedType] = useState<'customer' | 'trainer' | null>(null)
  const [loading, setLoading] = useState(false)

  const handleContinue = async () => {
    if (!selectedType) return

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      // Create profile with selected user type
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          user_type: selectedType,
          full_name: user.user_metadata.full_name || user.email?.split('@')[0] || '사용자',
          phone: user.user_metadata.phone || null,
          avatar_url: user.user_metadata.avatar_url || null
        })

      if (error) throw error

      // Redirect to appropriate setup page
      if (selectedType === 'customer') {
        router.push('/auth/setup/customer')
      } else {
        router.push('/auth/setup/trainer')
      }
    } catch (error) {
      console.error('Error creating profile:', error)
      alert('프로필 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-primary/5 to-background">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-5xl font-bold">
            어떤 서비스를 이용하시나요?
          </h1>
          <p className="text-lg md:text-2xl text-muted-foreground">
            서비스 유형을 선택해주세요
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 고객 카드 */}
          <Card
            className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
              selectedType === 'customer'
                ? 'ring-4 ring-primary shadow-xl'
                : 'hover:shadow-lg'
            }`}
            onClick={() => setSelectedType('customer')}
          >
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-6 w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-12 h-12 md:w-16 md:h-16 text-primary" />
              </div>
              <CardTitle className="text-2xl md:text-3xl">고객</CardTitle>
              <CardDescription className="text-lg md:text-xl mt-3">
                재활 서비스를 받고 싶어요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-base md:text-lg">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>전문 트레이너 검색</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>방문/센터 재활 예약</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>1:1, 1:2, 1:3 그룹 선택</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>리뷰 및 평가</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* 트레이너 카드 */}
          <Card
            className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
              selectedType === 'trainer'
                ? 'ring-4 ring-green-600 shadow-xl'
                : 'hover:shadow-lg'
            }`}
            onClick={() => setSelectedType('trainer')}
          >
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-6 w-24 h-24 md:w-32 md:h-32 rounded-full bg-green-600/10 flex items-center justify-center">
                <Dumbbell className="w-12 h-12 md:w-16 md:h-16 text-green-600" />
              </div>
              <CardTitle className="text-2xl md:text-3xl">트레이너</CardTitle>
              <CardDescription className="text-lg md:text-xl mt-3">
                재활 서비스를 제공하고 싶어요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-base md:text-lg">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>프로필 및 경력 등록</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>재활 프로그램 관리</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>스케줄 및 예약 관리</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>수익 정산</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleContinue}
            disabled={!selectedType || loading}
            className="h-16 md:h-20 px-12 text-xl md:text-2xl font-bold"
            size="lg"
          >
            계속하기
            <ArrowRight className="w-6 h-6 md:w-8 md:h-8 ml-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
