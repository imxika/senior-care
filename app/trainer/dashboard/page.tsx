'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dumbbell, Calendar, Star, AlertCircle } from 'lucide-react'

interface Profile {
  id: string
  user_type: string
  full_name: string
  phone: string | null
}

interface Trainer {
  id: string
  bio: string | null
  specialties: string[]
  years_experience: number | null
  is_verified: boolean
  is_active: boolean
}

export default function TrainerDashboard() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [trainer, setTrainer] = useState<Trainer | null>(null)

  useEffect(() => {
    const init = async () => {
      await loadProfile()
    }
    init()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const { data: trainerData } = await supabase
      .from('trainers')
      .select('*')
      .eq('profile_id', user.id)
      .single()

    setProfile(profileData)
    setTrainer(trainerData)
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 헤더 */}
        <div>
          <h1 className="text-3xl md:text-5xl font-bold">트레이너 대시보드</h1>
          <p className="text-lg md:text-xl text-muted-foreground mt-2">
            안녕하세요, {profile?.full_name}님
          </p>
        </div>

        {/* 승인 대기 알림 */}
        {!trainer?.is_verified && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="text-lg font-bold text-amber-900">승인 대기 중</h3>
                  <p className="text-amber-800 mt-1">
                    관리자 승인 후 서비스를 시작할 수 있습니다. 승인 완료 시 이메일로 알려드립니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 프로필 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Dumbbell className="w-6 h-6 text-green-600" />
              내 프로필
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-base md:text-lg">
            <p><strong>경력:</strong> {trainer?.years_experience}년</p>
            <p><strong>전문 분야:</strong> {trainer?.specialties?.join(', ') || '-'}</p>
            <p><strong>자격증:</strong> {trainer?.certifications?.join(', ') || '-'}</p>
            <p><strong>평점:</strong> ⭐ {trainer?.rating?.toFixed(1)} ({trainer?.total_reviews}개 리뷰)</p>
            <p><strong>서비스:</strong>
              {trainer?.home_visit_available && ' 방문 재활'}
              {trainer?.home_visit_available && trainer?.center_visit_available && ', '}
              {trainer?.center_visit_available && ' 센터 방문'}
            </p>
            <p><strong>상태:</strong>
              <span className={trainer?.is_verified ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}>
                {trainer?.is_verified ? ' 승인 완료' : ' 승인 대기'}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* 빠른 액션 */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Calendar className="w-6 h-6 text-green-600" />
                예약 관리
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                예약 현황을 확인하고 관리하세요
              </p>
              <Button className="w-full mt-4 bg-green-600 hover:bg-green-700" size="lg" disabled={!trainer?.is_verified}>
                보기
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Dumbbell className="w-6 h-6 text-green-600" />
                프로그램 관리
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                재활 프로그램을 등록하고 관리하세요
              </p>
              <Button className="w-full mt-4" variant="outline" size="lg" disabled={!trainer?.is_verified}>
                관리하기
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Star className="w-6 h-6 text-green-600" />
                리뷰 관리
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                고객 리뷰를 확인하고 응답하세요
              </p>
              <Button className="w-full mt-4" variant="outline" size="lg" disabled={!trainer?.is_verified}>
                보기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
