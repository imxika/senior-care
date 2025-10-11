import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Star, Home, Building, ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'
import { BookingForm } from '@/components/booking-form'
import { BookingFormWrapper } from '@/components/booking-form-wrapper'
import { getTrainerPricing } from '@/lib/pricing-utils'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    session?: string
    service?: string
  }>
}

export default async function TrainerBookingPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const search = await searchParams
  const sessionType = (search.session as '1:1' | '2:1' | '3:1') || '1:1'
  const serviceType = search.service as 'home' | 'center' | 'all' | undefined

  // Debug log
  console.log('TrainerBookingPage - id:', id, 'typeof:', typeof id)

  const supabase = await createClient()

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 고객인지 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'customer') {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              예약은 고객 계정으로만 가능합니다.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 고객 정보 가져오기
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!customer) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              고객 정보를 찾을 수 없습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    )
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

  console.log('Trainer fetched - id:', trainer?.id)
  console.log('Trainer max_group_size:', trainer?.max_group_size)
  console.log('Trainer years_experience:', trainer?.years_experience)

  if (error || !trainer) {
    console.error('Trainer fetch error:', error)
    notFound()
  }

  // 경력 계산 (fallback 지원)
  const experienceYears = trainer.years_experience || trainer.experience_years || 0

  // 가격 정책 가져오기
  console.log('Fetching pricing for trainer:', id)
  const pricing = await getTrainerPricing(id)
  console.log('Pricing fetched:', pricing ? 'success' : 'failed')

  if (!pricing) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              가격 정보를 불러올 수 없습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <Link
        href={`/trainers/${id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        트레이너 프로필로 돌아가기
      </Link>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left - Booking Form */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>예약 정보 입력</CardTitle>
              <CardDescription>
                필요한 정보를 입력하고 예약을 요청하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BookingForm
                trainerId={trainer.id}
                customerId={customer.id}
                homeVisitAvailable={trainer.home_visit_available}
                centerVisitAvailable={trainer.center_visit_available}
                trainerMaxGroupSize={trainer.max_group_size || 1}
                initialSessionType={sessionType}
                initialServiceType={serviceType}
                hourlyRate={trainer.hourly_rate || 100000}
                centerName={trainer.center_name}
                centerAddress={trainer.center_address}
                centerPhone={trainer.center_phone}
                pricingConfig={pricing.config}
                pricingPolicy={pricing.policy}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right - Trainer Summary */}
        <div className="space-y-4">
          {/* Trainer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">트레이너 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Link href={`/trainers/${id}`}>
                  <Avatar className="h-16 w-16 cursor-pointer hover:opacity-80 transition-opacity">
                    <AvatarImage src={trainer.profiles?.avatar_url || undefined} alt={trainer.profiles?.full_name} />
                    <AvatarFallback className="text-xl font-bold">
                      {trainer.profiles?.full_name?.charAt(0) || 'T'}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1">
                  <Link href={`/trainers/${id}`}>
                    <h3 className="font-semibold hover:text-primary transition-colors cursor-pointer">
                      {trainer.profiles?.full_name}
                    </h3>
                  </Link>
                  <Link
                    href={`/trainers/${id}#reviews`}
                    className="flex items-center gap-1 mt-1 hover:text-primary transition-colors w-fit"
                  >
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{trainer.rating?.toFixed(1) || '0.0'}</span>
                    <span className="text-sm text-muted-foreground hover:text-primary">
                      ({trainer.total_reviews || 0}개 리뷰)
                    </span>
                  </Link>
                  <p className="text-sm text-muted-foreground mt-1">
                    {experienceYears}년 경력
                  </p>
                </div>
              </div>

              <Separator />

              {/* Session Types */}
              <div>
                <p className="text-sm font-medium mb-2">제공 가능한 세션</p>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">최대 <strong>{trainer.max_group_size || 1}명</strong></span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">1:1 개인</Badge>
                  {(trainer.max_group_size || 1) >= 2 && (
                    <Badge variant="outline">2:1 소그룹</Badge>
                  )}
                  {(trainer.max_group_size || 1) >= 3 && (
                    <Badge variant="outline">3:1 소그룹</Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* Service Types */}
              <div>
                <p className="text-sm font-medium mb-2">제공 서비스</p>
                <div className="flex flex-wrap gap-2">
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
              </div>

              {/* Service Areas */}
              {trainer.service_areas && trainer.service_areas.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">서비스 지역</p>
                    <div className="flex flex-wrap gap-1">
                      {trainer.service_areas.map((area: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notice */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-medium text-sm mb-2">예약 안내</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• 예약 확정까지 1-2일 소요될 수 있습니다</li>
                <li>• 트레이너 사정으로 예약이 거절될 수 있습니다</li>
                <li>• 예약 취소는 24시간 전까지 가능합니다</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
