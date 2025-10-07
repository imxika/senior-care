import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Star, MapPin, Award, Calendar, Home, Building, Mail, Phone, CheckCircle2, Users } from 'lucide-react'
import Link from 'next/link'
import { FavoriteToggleButton } from '@/components/favorite-toggle-button'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TrainerDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser()

  // 현재 사용자가 트레이너인지, 고객인지 확인
  let isCurrentUserTrainer = false
  let isOwnProfile = false
  let customerId: string | null = null

  if (user) {
    const { data: currentTrainer } = await supabase
      .from('trainers')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (currentTrainer) {
      isCurrentUserTrainer = true
      isOwnProfile = currentTrainer.id === id
    } else {
      // 트레이너가 아니면 고객 ID 조회
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (customer) {
        customerId = customer.id
      }
    }
  }

  // 트레이너 정보 가져오기
  const { data: trainer, error } = await supabase
    .from('trainers')
    .select(`
      *,
      profiles!trainers_profile_id_fkey (
        full_name,
        avatar_url,
        email,
        phone
      )
    `)
    .eq('id', id)
    .eq('is_verified', true)
    .eq('is_active', true)
    .single()

  if (error || !trainer) {
    notFound()
  }

  // Use years_experience as it's the actual column in DB
  const experienceYears = trainer.years_experience || trainer.experience_years || 0

  // 리뷰 목록 조회
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
        booking_date,
        service_type
      )
    `)
    .eq('trainer_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
      {/* Header Section */}
      <div className="mb-4 md:mb-8">
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
              {/* Avatar */}
              <Avatar className="h-20 w-20 md:h-32 md:w-32 mx-auto md:mx-0">
                <AvatarImage src={trainer.profiles?.avatar_url || undefined} alt={trainer.profiles?.full_name} />
                <AvatarFallback className="text-2xl md:text-4xl font-bold">
                  {trainer.profiles?.full_name?.charAt(0) || 'T'}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1">
                <div className="mb-3 md:mb-4">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 text-center md:text-left">
                    {trainer.profiles?.full_name}
                  </h1>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                    <div className="flex items-center">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="ml-1 font-semibold text-base md:text-lg">{trainer.rating?.toFixed(1) || '0.0'}</span>
                      <span className="ml-1 text-muted-foreground text-base">({trainer.total_reviews || 0}개 리뷰)</span>
                    </div>
                    {trainer.is_verified && (
                      <Badge variant="outline" className="border-green-500 text-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        인증됨
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground text-base">
                    <Award className="h-4 w-4" />
                    <span>{experienceYears}년 경력</span>
                  </div>
                </div>

                {/* Service Types */}
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4 md:mb-0">
                  {trainer.home_visit_available && (
                    <Badge variant="secondary">
                      <Home className="h-3 w-3 mr-1" />
                      방문 서비스
                    </Badge>
                  )}
                  {trainer.center_visit_available && (
                    <Badge variant="secondary">
                      <Building className="h-3 w-3 mr-1" />
                      센터 방문
                    </Badge>
                  )}
                </div>

                {/* Action Buttons - Mobile */}
                <div className="flex gap-2 md:hidden">
                  <FavoriteToggleButton
                    trainerId={trainer.id}
                    customerId={customerId}
                    size="default"
                    className="h-11"
                  />
                  {isOwnProfile ? (
                    <Button disabled className="flex-1 h-11" variant="outline">
                      내 프로필
                    </Button>
                  ) : isCurrentUserTrainer ? (
                    <Button disabled className="flex-1 h-11" variant="outline">
                      예약 불가
                    </Button>
                  ) : (
                    <Button asChild className="flex-1 h-11">
                      <Link href={`/trainers/${trainer.id}/booking`}>
                        <Calendar className="h-4 w-4 mr-2" />
                        예약하기
                      </Link>
                    </Button>
                  )}
                </div>

                {/* Action Buttons - Desktop */}
                <div className="hidden md:flex gap-2 absolute top-6 right-6">
                  <FavoriteToggleButton
                    trainerId={trainer.id}
                    customerId={customerId}
                    size="lg"
                  />
                  {isOwnProfile ? (
                    <Button disabled size="lg" variant="outline">
                      내 프로필
                    </Button>
                  ) : isCurrentUserTrainer ? (
                    <Button disabled size="lg" variant="outline">
                      예약 불가
                    </Button>
                  ) : (
                    <Button asChild size="lg">
                      <Link href={`/trainers/${trainer.id}/booking`}>
                        <Calendar className="h-4 w-4 mr-2" />
                        예약하기
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - Main Info */}
        <div className="md:col-span-2 space-y-4 md:space-y-6">
          {/* Bio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">소개</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base text-muted-foreground leading-relaxed">
                {trainer.bio || '소개 정보가 없습니다.'}
              </p>
            </CardContent>
          </Card>

          {/* Specializations */}
          {trainer.specializations && trainer.specializations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">전문 분야</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {trainer.specializations.map((spec: string, index: number) => (
                    <Badge key={index} variant="outline">{spec}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Certifications */}
          {trainer.certifications && trainer.certifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="h-5 w-5" />
                  자격증
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {trainer.certifications.map((cert: string, index: number) => (
                    <li key={index} className="flex items-center gap-2 text-base">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      <span>{cert}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Reviews Section */}
          <Card id="reviews">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">리뷰 ({trainer.total_reviews || 0})</CardTitle>
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-lg">{trainer.rating?.toFixed(1) || '0.0'}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {reviews && reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review: any) => (
                    <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                      <div className="flex items-start gap-3 mb-2">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={review.customer?.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {review.customer?.profiles?.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium">
                              {review.customer?.profiles?.full_name || '익명'}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          {review.comment && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {review.comment}
                            </p>
                          )}
                          {review.trainer_response && (
                            <div className="mt-3 pl-3 border-l-2 border-primary/20">
                              <p className="text-xs font-medium text-primary mb-1">트레이너 답글</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {review.trainer_response}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 md:py-8 text-base text-muted-foreground">
                  아직 리뷰가 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-4 md:space-y-6">
          {/* Maximum Group Size */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                제공 가능한 세션
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">최대 인원</span>
                  <span className="font-semibold text-lg">
                    {trainer.max_group_size || 1}명
                  </span>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">가능한 세션 유형:</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-primary/5">
                      1:1 개인
                    </Badge>
                    {(trainer.max_group_size || 1) >= 2 && (
                      <Badge variant="outline" className="bg-primary/5">
                        2:1 소그룹
                      </Badge>
                    )}
                    {(trainer.max_group_size || 1) >= 3 && (
                      <Badge variant="outline" className="bg-primary/5">
                        3:1 소그룹
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Areas */}
          {trainer.service_areas && trainer.service_areas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" />
                  서비스 지역
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {trainer.service_areas.map((area: string, index: number) => (
                    <Badge key={index} variant="secondary">{area}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing */}
          {trainer.hourly_rate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">시간당 요금</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {trainer.hourly_rate.toLocaleString()}원
                </div>
                <p className="text-sm text-muted-foreground mt-1">1시간 기준</p>
              </CardContent>
            </Card>
          )}

          {/* Contact Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">연락처</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {trainer.profiles?.email && (
                <div className="flex items-center gap-2 text-base break-all">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{trainer.profiles.email}</span>
                </div>
              )}
              {trainer.profiles?.phone && (
                <div className="flex items-center gap-2 text-base">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{trainer.profiles.phone}</span>
                </div>
              )}
              <Separator />
              {isOwnProfile ? (
                <Button disabled className="w-full h-11" variant="outline">
                  내 프로필
                </Button>
              ) : isCurrentUserTrainer ? (
                <Button disabled className="w-full h-11" variant="outline">
                  예약 불가
                </Button>
              ) : (
                <Button asChild className="w-full h-11">
                  <Link href={`/trainers/${trainer.id}/booking`}>
                    <Calendar className="h-4 w-4 mr-2" />
                    예약 문의하기
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">통계</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">경력</span>
                <span className="font-medium">{experienceYears}년</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">평점</span>
                <span className="font-medium">{trainer.rating?.toFixed(1) || '0.0'} ⭐</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">리뷰 수</span>
                <span className="font-medium">{trainer.total_reviews || 0}개</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
