import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Heart, Star, MapPin, DollarSign, Users } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { RemoveFavoriteButton } from './remove-favorite-button'

export default async function CustomerFavoritesPage() {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 고객 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'customer') {
    redirect('/')
  }

  // 고객 ID 조회
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!customer) {
    redirect('/customer/dashboard')
  }

  // 즐겨찾기 목록 조회 (트레이너 정보 포함)
  const { data: favorites, error } = await supabase
    .from('favorites')
    .select(`
      id,
      created_at,
      trainer:trainers(
        id,
        bio,
        specialties,
        years_experience,
        rating,
        total_reviews,
        hourly_rate,
        home_visit_available,
        center_visit_available,
        service_areas,
        profiles!trainers_profile_id_fkey(
          full_name,
          avatar_url
        )
      )
    `)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching favorites:', error)
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
                <BreadcrumbLink href="/customer/dashboard">고객</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>즐겨찾기</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6 md:gap-8 md:p-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
            <Heart className="h-8 w-8 md:h-10 md:w-10 text-red-500" />
            즐겨찾기
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            {profile?.full_name}님이 즐겨찾기한 트레이너 목록입니다
          </p>
        </div>

        {/* 즐겨찾기 목록 */}
        {!favorites || favorites.length === 0 ? (
          <Card className="border-2">
            <CardContent className="py-12 md:py-16 text-center">
              <Heart className="w-16 h-16 md:w-20 md:h-20 text-muted-foreground mx-auto mb-5" />
              <h3 className="text-2xl md:text-3xl font-semibold mb-3">
                즐겨찾기한 트레이너가 없습니다
              </h3>
              <p className="text-lg md:text-xl text-muted-foreground mb-6 md:mb-8">
                마음에 드는 트레이너를 즐겨찾기에 추가해보세요
              </p>
              <Link href="/trainers">
                <Button className="h-14 text-lg px-8">
                  트레이너 둘러보기
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:gap-6 md:grid-cols-2">
            {favorites.map((favorite) => {
              const trainer = favorite.trainer
              if (!trainer) return null

              return (
                <Card key={favorite.id} className="overflow-hidden hover:shadow-lg transition-all border-2">
                  <CardContent className="p-6">
                    {/* 프로필 헤더 */}
                    <div className="flex items-start gap-4 mb-5">
                      <Avatar className="h-16 w-16 md:h-20 md:w-20 shrink-0">
                        <AvatarImage
                          src={trainer.profiles?.avatar_url || ''}
                          alt={trainer.profiles?.full_name || '트레이너'}
                        />
                        <AvatarFallback className="text-xl">
                          {trainer.profiles?.full_name?.charAt(0) || 'T'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-xl md:text-2xl mb-2">
                          {trainer.profiles?.full_name || '이름 없음'}
                        </h3>
                        <div className="flex items-center gap-2 text-base md:text-lg text-yellow-600">
                          <Star className="h-6 w-6 fill-current" />
                          <span className="font-semibold">{trainer.rating || '5.0'}</span>
                          <span className="text-muted-foreground">
                            ({trainer.total_reviews || 0})
                          </span>
                        </div>
                      </div>
                      <RemoveFavoriteButton favoriteId={favorite.id} />
                    </div>

                    {/* 소개 */}
                    {trainer.bio && (
                      <p className="text-base md:text-lg text-muted-foreground mb-4 line-clamp-2">
                        {trainer.bio}
                      </p>
                    )}

                    {/* 전문 분야 */}
                    {trainer.specialties && trainer.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {trainer.specialties.slice(0, 3).map((specialty, idx) => (
                          <Badge key={idx} variant="secondary" className="text-sm md:text-base px-3 py-1">
                            {specialty}
                          </Badge>
                        ))}
                        {trainer.specialties.length > 3 && (
                          <Badge variant="outline" className="text-sm md:text-base px-3 py-1">
                            +{trainer.specialties.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* 정보 */}
                    <div className="space-y-3 mb-5 text-base md:text-lg">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Users className="h-5 w-5 shrink-0" />
                        <span>{trainer.years_experience || 0}년 경력</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <DollarSign className="h-5 w-5 shrink-0" />
                        <span>시간당 {trainer.hourly_rate?.toLocaleString()}원</span>
                      </div>
                      {trainer.service_areas && trainer.service_areas.length > 0 && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <MapPin className="h-5 w-5 shrink-0" />
                          <span className="line-clamp-1">
                            {trainer.service_areas.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 액션 버튼 */}
                    <div className="grid grid-cols-2 gap-3">
                      <Link href={`/trainers/${trainer.id}`} className="flex-1">
                        <Button variant="outline" className="w-full h-12 text-base md:text-lg">
                          프로필 보기
                        </Button>
                      </Link>
                      <Link href={`/customer/booking/new?trainer=${trainer.id}`} className="flex-1">
                        <Button className="w-full h-12 text-base md:text-lg">
                          예약하기
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
