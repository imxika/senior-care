'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SimpleLoading } from '@/components/loading'
import { getVerifiedTrainers } from '@/lib/supabase/queries'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Star, MapPin, Award, Home, Building, Search, Users, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { FavoriteButton } from '@/components/favorite-button'

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
  max_group_size?: number | null
  profiles?: {
    full_name: string
    avatar_url: string | null
  }
  center?: {
    id: string
    name: string
    address: string | null
    phone: string | null
  } | null
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

// 이름 마스킹 함수 (성만 보이게)
function maskName(fullName: string | null | undefined): string {
  if (!fullName) return '이름 없음'

  // "홍길동" -> "홍**"
  if (fullName.length === 1) return fullName
  if (fullName.length === 2) return fullName[0] + '*'
  return fullName[0] + '*'.repeat(fullName.length - 1)
}

function TrainersPageContent() {
  const searchParams = useSearchParams()
  const sessionType = searchParams.get('session') || 'all' // 'all', '1', '2', '3'
  const serviceType = searchParams.get('service') || 'all' // 'home', 'center', 'all'

  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [serviceFilter, setServiceFilter] = useState<'all' | 'home' | 'center'>(
    serviceType as 'all' | 'home' | 'center'
  )
  const [sessionFilter, setSessionFilter] = useState<'all' | '1' | '2' | '3'>('all')
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null)
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [selectedCenter, setSelectedCenter] = useState<string | null>(null)
  const [currentUserTrainerId, setCurrentUserTrainerId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    loadTrainers()
    checkCurrentUser()
  }, [])

  const checkCurrentUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      setIsLoggedIn(true)
      // 현재 사용자가 트레이너인지 확인
      const { data: trainer } = await supabase
        .from('trainers')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (trainer) {
        setCurrentUserTrainerId(trainer.id)
      }
    } else {
      setIsLoggedIn(false)
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
      setIsLoading(false)
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

    // 전문분야 필터
    const matchesSpecialty =
      !selectedSpecialty ||
      trainer.specialties?.some((s: string) => s === selectedSpecialty)

    // 지역 필터
    const matchesArea =
      !selectedArea ||
      trainer.service_areas?.some((area: string) => area === selectedArea)

    // 센터 필터
    const matchesCenter =
      !selectedCenter ||
      trainer.center?.name === selectedCenter

    // 세션 타입 필터 (max_group_size 기준)
    const matchesSession =
      sessionFilter === 'all' ||
      (trainer.max_group_size && trainer.max_group_size >= parseInt(sessionFilter))

    return matchesSearch && matchesService && matchesSpecialty && matchesArea && matchesCenter && matchesSession
  })

  // 필터 초기화 함수
  const clearFilters = () => {
    setSelectedSpecialty(null)
    setSelectedArea(null)
    setSelectedCenter(null)
    setSearchTerm('')
    setServiceFilter('all')
    setSessionFilter('all')
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen">
        <SimpleLoading message="트레이너 목록을 불러오는 중..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-5xl font-bold">건강 전문가 찾기</h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            재활부터 평생 건강까지, 맞춤형 전문 케어
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

          {/* 모바일: 필터 토글 버튼 */}
          <div className="md:hidden">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full h-12 text-base"
            >
              <SlidersHorizontal className="w-5 h-5 mr-2" />
              상세 필터
              {showFilters ? (
                <ChevronUp className="w-5 h-5 ml-auto" />
              ) : (
                <ChevronDown className="w-5 h-5 ml-auto" />
              )}
            </Button>
          </div>

          {/* 필터 섹션 */}
          <div className={`space-y-4 ${showFilters ? 'block' : 'hidden md:block'}`}>
            <div className="grid md:grid-cols-2 gap-6">
              {/* 서비스 방식 */}
              <div>
                <p className="text-center text-sm font-medium mb-3 text-muted-foreground">서비스 방식</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button
                    variant={serviceFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setServiceFilter('all')}
                    className="h-11 text-sm"
                    size="sm"
                  >
                    전체
                  </Button>
                  <Button
                    variant={serviceFilter === 'home' ? 'default' : 'outline'}
                    onClick={() => setServiceFilter('home')}
                    className="h-11 text-sm"
                    size="sm"
                  >
                    <Home className="w-4 h-4 mr-1.5" />
                    방문
                  </Button>
                  <Button
                    variant={serviceFilter === 'center' ? 'default' : 'outline'}
                    onClick={() => setServiceFilter('center')}
                    className="h-11 text-sm"
                    size="sm"
                  >
                    <Building className="w-4 h-4 mr-1.5" />
                    센터
                  </Button>
                </div>
              </div>

              {/* 그룹 인원 */}
              <div>
                <p className="text-center text-sm font-medium mb-3 text-muted-foreground">그룹 인원</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button
                    variant={sessionFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setSessionFilter('all')}
                    className="h-11 text-sm"
                    size="sm"
                  >
                    전체
                  </Button>
                  <Button
                    variant={sessionFilter === '1' ? 'default' : 'outline'}
                    onClick={() => setSessionFilter('1')}
                    className="h-11 text-sm"
                    size="sm"
                  >
                    1:1
                  </Button>
                  <Button
                    variant={sessionFilter === '2' ? 'default' : 'outline'}
                    onClick={() => setSessionFilter('2')}
                    className="h-11 text-sm"
                    size="sm"
                  >
                    1:2
                  </Button>
                  <Button
                    variant={sessionFilter === '3' ? 'default' : 'outline'}
                    onClick={() => setSessionFilter('3')}
                    className="h-11 text-sm"
                    size="sm"
                  >
                    1:3
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* 활성 필터 표시 */}
          {(selectedSpecialty || selectedArea || selectedCenter) && (
            <div className="flex items-center gap-3 justify-center flex-wrap">
              <span className="text-sm text-muted-foreground">필터:</span>
              {selectedSpecialty && (
                <Badge
                  variant="secondary"
                  className="h-8 px-3 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  onClick={() => setSelectedSpecialty(null)}
                >
                  {selectedSpecialty} ✕
                </Badge>
              )}
              {selectedArea && (
                <Badge
                  variant="secondary"
                  className="h-8 px-3 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  onClick={() => setSelectedArea(null)}
                >
                  📍 {selectedArea} ✕
                </Badge>
              )}
              {selectedCenter && (
                <Badge
                  variant="secondary"
                  className="h-8 px-3 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  onClick={() => setSelectedCenter(null)}
                >
                  🏢 {selectedCenter} ✕
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-sm"
              >
                전체 초기화
              </Button>
            </div>
          )}
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
              <Card key={trainer.id} className="hover:shadow-2xl hover:scale-[1.02] hover:border-primary/50 hover:bg-accent/10 transition-all duration-300 relative group overflow-hidden cursor-pointer">
                {trainer.sanity?.featured && (
                  <Badge className="absolute top-4 right-4 z-10" variant="secondary">
                    ⭐ 추천
                  </Badge>
                )}

                {/* 카드 전체를 클릭 가능하게 */}
                <Link href={`/trainers/${trainer.id}`} className="block">
                  <CardHeader>
                    {/* 프로필 이미지 & 이름 & 찜하기 버튼 */}
                    <div className="flex items-center gap-4 mb-3">
                      <Avatar className="w-16 h-16 group-hover:scale-105 transition-transform">
                        <AvatarImage
                          src={trainer.sanity?.profileImage?.asset?.url || trainer.profiles?.avatar_url || undefined}
                          alt={trainer.profiles?.full_name || '트레이너'}
                        />
                        <AvatarFallback className="text-2xl font-bold">
                          {trainer.profiles?.full_name?.charAt(0) || 'T'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                          {isLoggedIn ? trainer.profiles?.full_name || '이름 없음' : maskName(trainer.profiles?.full_name)}
                        </CardTitle>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-bold">{trainer.rating?.toFixed(1)}</span>
                          <span className="text-sm text-muted-foreground">
                            ({trainer.total_reviews}개 리뷰)
                          </span>
                        </div>
                      </div>
                      {/* 찜하기 버튼 - 아바타와 대칭, 같은 높이 */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <FavoriteButton
                          trainerId={trainer.id}
                          variant="ghost"
                          size="lg"
                          className="h-16 w-16 rounded-full bg-white/90 hover:bg-white shadow-md hover:shadow-lg transition-all"
                        />
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

                  {/* 전문 분야 (Sanity 우선, 없으면 Supabase) - 클릭 가능 */}
                  {((trainer.sanity?.specializations && trainer.sanity.specializations.length > 0) ||
                    (trainer.specialties && trainer.specialties.length > 0)) && (
                    <div>
                      <p className="text-sm font-semibold mb-2">전문 분야</p>
                      <div className="flex flex-wrap gap-2">
                        {(trainer.sanity?.specializations || trainer.specialties || [])
                          .slice(0, 3)
                          .map((specialty: string, idx: number) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setSelectedSpecialty(specialty)
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                              }}
                            >
                              {specialty}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* 센터 정보 - 클릭 가능 */}
                  {trainer.center_visit_available && trainer.center && (
                    <div>
                      <p className="text-sm font-semibold mb-2 flex items-center gap-1">
                        <Building className="w-4 h-4" />
                        센터 정보
                      </p>
                      <Badge
                        variant="default"
                        className="cursor-pointer hover:bg-primary/80 transition-colors text-base px-3 py-1"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setSelectedCenter(trainer.center.name)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                      >
                        🏢 {trainer.center.name}
                      </Badge>
                      {trainer.center.address && (
                        <p className="text-xs text-muted-foreground mt-2">
                          📍 {trainer.center.address}
                        </p>
                      )}
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

                  {/* 서비스 지역 - 클릭 가능 */}
                  {trainer.service_areas && trainer.service_areas.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        서비스 지역
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {trainer.service_areas.slice(0, 3).map((area: string, idx: number) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setSelectedArea(area)
                              window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                          >
                            📍 {area}
                          </Badge>
                        ))}
                        {trainer.service_areas.length > 3 && (
                          <Badge variant="outline" className="cursor-default">
                            +{trainer.service_areas.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  </CardContent>
                </Link>

                {/* 예약하기 버튼만 별도 액션 */}
                <CardFooter>
                  {currentUserTrainerId === trainer.id ? (
                    <Button disabled className="w-full h-12 text-base" variant="outline">
                      내 프로필
                    </Button>
                  ) : currentUserTrainerId ? (
                    <Button disabled className="w-full h-12 text-base" variant="outline">
                      예약 불가
                    </Button>
                  ) : (
                    <Link
                      href={`/trainers/${trainer.id}/booking?session=${sessionType}&service=${serviceType}`}
                      className="w-full cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button className="w-full h-12 text-base cursor-pointer">
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

export default function TrainersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">트레이너 목록을 불러오는 중...</div>
      </div>
    }>
      <TrainersPageContent />
    </Suspense>
  )
}
