'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getVerifiedTrainers } from '@/lib/supabase/queries'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Star, MapPin, Award, Home, Building, Search } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'

interface Trainer {
  id: string
  bio: string
  specialties: string[]
  service_areas: string[]
  years_experience: number
  rating: number
  total_reviews: number
  home_visit_available: boolean
  center_visit_available: boolean
  profiles?: {
    full_name: string
    avatar_url: string | null
  }
  sanity?: {
    supabaseId: string
    profileImage?: {
      asset?: {
        url: string
      }
    }
    shortBio?: string
    specializations?: string[]
    featured?: boolean
  }
}

export default function TrainersPage() {
  const searchParams = useSearchParams()
  const sessionType = searchParams.get('session') || '1:1' // '1:1', '2:1', '3:1'
  const serviceType = searchParams.get('service') || 'all' // 'home', 'center', 'all'

  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [serviceFilter, setServiceFilter] = useState<'all' | 'home' | 'center'>(
    serviceType as 'all' | 'home' | 'center'
  )
  const [currentUserTrainerId, setCurrentUserTrainerId] = useState<string | null>(null)

  useEffect(() => {
    loadTrainers()
    checkCurrentUser()
  }, [])

  const checkCurrentUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // 현재 사용자가 트레이너인지 확인
      const { data: trainer } = await supabase
        .from('trainers')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (trainer) {
        setCurrentUserTrainerId(trainer.id)
      }
    }
  }

  const loadTrainers = async () => {
    try {
      const data = await getVerifiedTrainers()
      console.log('Trainers data:', data)
      if (data && data.length > 0) {
        console.log('First trainer FULL OBJECT:', JSON.stringify(data[0], null, 2))
      }
      setTrainers(data || [])
    } catch (error) {
      console.error('Error loading trainers:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
    } finally {
      setLoading(false)
    }
  }

  // 필터링
  const filteredTrainers = trainers.filter(trainer => {
    // 검색어 필터
    const matchesSearch =
      trainer.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainer.specialties?.some((s: string) => s.toLowerCase().includes(searchTerm.toLowerCase()))

    // 서비스 타입 필터
    const matchesService =
      serviceFilter === 'all' ||
      (serviceFilter === 'home' && trainer.home_visit_available) ||
      (serviceFilter === 'center' && trainer.center_visit_available)

    return matchesSearch && matchesService
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-5xl font-bold">전문 트레이너 찾기</h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            검증된 재활 전문가들을 만나보세요
          </p>
        </div>

        {/* 검색 & 필터 */}
        <div className="space-y-4">
          {/* 검색바 */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="이름 또는 전문분야 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 text-lg"
            />
          </div>

          {/* 서비스 타입 필터 */}
          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              variant={serviceFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setServiceFilter('all')}
              className="h-12"
            >
              전체
            </Button>
            <Button
              variant={serviceFilter === 'home' ? 'default' : 'outline'}
              onClick={() => setServiceFilter('home')}
              className="h-12"
            >
              <Home className="w-5 h-5 mr-2" />
              방문 재활
            </Button>
            <Button
              variant={serviceFilter === 'center' ? 'default' : 'outline'}
              onClick={() => setServiceFilter('center')}
              className="h-12"
            >
              <Building className="w-5 h-5 mr-2" />
              센터 방문
            </Button>
          </div>
        </div>

        {/* 결과 수 */}
        <p className="text-center text-muted-foreground">
          {filteredTrainers.length}명의 트레이너를 찾았습니다
        </p>

        {/* 트레이너 리스트 */}
        {filteredTrainers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">검색 결과가 없습니다</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrainers.map((trainer) => (
              <Card key={trainer.id} className="hover:shadow-lg transition-shadow relative">
                {trainer.sanity?.featured && (
                  <Badge className="absolute top-4 right-4 z-10" variant="secondary">
                    ⭐ 추천
                  </Badge>
                )}
                <CardHeader>
                  {/* 프로필 이미지 & 이름 */}
                  <div className="flex items-center gap-4 mb-3">
                    <Avatar className="w-16 h-16">
                      <AvatarImage
                        src={trainer.sanity?.profileImage?.asset?.url || trainer.profiles?.avatar_url || undefined}
                        alt={trainer.profiles?.full_name || '트레이너'}
                      />
                      <AvatarFallback className="text-2xl font-bold">
                        {trainer.profiles?.full_name?.charAt(0) || 'T'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-xl">{trainer.profiles?.full_name || '이름 없음'}</CardTitle>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold">{trainer.rating?.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">
                          ({trainer.total_reviews}개 리뷰)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 경력 */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Award className="w-4 h-4" />
                    <span>{trainer.years_experience}년 경력</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Sanity 소개 또는 기본 bio */}
                  {trainer.sanity?.shortBio && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {trainer.sanity.shortBio}
                    </p>
                  )}

                  {/* 전문 분야 (Sanity 우선, 없으면 Supabase) */}
                  {((trainer.sanity?.specializations && trainer.sanity.specializations.length > 0) ||
                    (trainer.specialties && trainer.specialties.length > 0)) && (
                    <div>
                      <p className="text-sm font-semibold mb-2">전문 분야</p>
                      <div className="flex flex-wrap gap-2">
                        {(trainer.sanity?.specializations || trainer.specialties || [])
                          .slice(0, 3)
                          .map((specialty: string, idx: number) => (
                            <Badge key={idx} variant="secondary">
                              {specialty}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* 서비스 제공 방식 */}
                  <div className="flex gap-2 flex-wrap">
                    {trainer.home_visit_available && (
                      <div className="flex items-center gap-1 text-sm">
                        <Home className="w-4 h-4 text-primary" />
                        <span>방문 가능</span>
                      </div>
                    )}
                    {trainer.center_visit_available && (
                      <div className="flex items-center gap-1 text-sm">
                        <Building className="w-4 h-4 text-green-600" />
                        <span>센터 보유</span>
                      </div>
                    )}
                  </div>

                  {/* 서비스 지역 */}
                  {trainer.service_areas && trainer.service_areas.length > 0 && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        {trainer.service_areas.slice(0, 3).join(', ')}
                        {trainer.service_areas.length > 3 && ' 외'}
                      </p>
                    </div>
                  )}
                </CardContent>

                <CardFooter>
                  {currentUserTrainerId === trainer.id ? (
                    <div className="w-full">
                      <Button disabled className="w-full h-12 text-base" variant="outline">
                        내 프로필
                      </Button>
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        본인의 프로필입니다
                      </p>
                    </div>
                  ) : currentUserTrainerId ? (
                    <div className="w-full">
                      <Button disabled className="w-full h-12 text-base" variant="outline">
                        예약 불가
                      </Button>
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        트레이너는 예약을 생성할 수 없습니다
                      </p>
                    </div>
                  ) : (
                    <Link href={`/trainers/${trainer.id}/booking?session=${sessionType}&service=${serviceType}`} className="w-full">
                      <Button className="w-full h-12 text-base">
                        예약하기
                      </Button>
                    </Link>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
