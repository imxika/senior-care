import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { User, Mail, Phone, Star, Award, DollarSign, MapPin, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { AvatarUpload } from '@/components/avatar-upload'
import { Badge } from '@/components/ui/badge'

export default async function TrainerProfilePage() {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 프로필 정보 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'trainer') {
    redirect('/')
  }

  // 트레이너 상세 정보 조회
  const { data: trainer } = await supabase
    .from('trainers')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/trainer/dashboard">트레이너</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>프로필</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">내 프로필</h1>
          <p className="text-muted-foreground mt-1">트레이너 프로필 정보를 확인하고 수정하세요</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* 프로필 사진 */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>프로필 사진</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <AvatarUpload
                currentAvatarUrl={profile?.avatar_url}
                userId={user.id}
                userName={profile?.full_name}
              />
            </CardContent>
          </Card>

          {/* 기본 정보 */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>이름</span>
                  </div>
                  <p className="font-medium">{profile?.full_name || '이름 없음'}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>이메일</span>
                  </div>
                  <p className="font-medium">{profile?.email || '이메일 없음'}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>전화번호</span>
                  </div>
                  <p className="font-medium">{profile?.phone || '등록된 전화번호 없음'}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>가입일</span>
                  </div>
                  <p className="font-medium">
                    {new Date(profile?.created_at || '').toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 트레이너 전문 정보 */}
          {trainer && (
            <>
              <Card className="md:col-span-3">
                <CardHeader>
                  <CardTitle>전문 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Award className="h-4 w-4" />
                        <span>경력</span>
                      </div>
                      <p className="font-medium">{trainer.years_experience || 0}년</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-4 w-4" />
                        <span>평점</span>
                      </div>
                      <p className="font-medium">
                        {trainer.rating || '5.0'} ({trainer.total_reviews || 0}개)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>시간당 요금</span>
                      </div>
                      <p className="font-medium">{trainer.hourly_rate?.toLocaleString()}원</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">활성 상태</p>
                      <Badge variant={trainer.is_active ? 'default' : 'secondary'}>
                        {trainer.is_active ? '활성화' : '비활성화'}
                      </Badge>
                    </div>
                  </div>

                  {trainer.bio && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">소개</p>
                      <p className="text-sm">{trainer.bio}</p>
                    </div>
                  )}

                  {trainer.specialties && trainer.specialties.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">전문 분야</p>
                      <div className="flex flex-wrap gap-2">
                        {trainer.specialties.map((specialty, idx) => (
                          <Badge key={idx} variant="secondary">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {trainer.certifications && trainer.certifications.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">자격증</p>
                      <div className="flex flex-wrap gap-2">
                        {trainer.certifications.map((cert, idx) => (
                          <Badge key={idx} variant="outline">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="md:col-span-3">
                <CardHeader>
                  <CardTitle>서비스 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">방문 서비스</p>
                      <Badge variant={trainer.home_visit_available ? 'default' : 'secondary'}>
                        {trainer.home_visit_available ? '가능' : '불가능'}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">센터 서비스</p>
                      <Badge variant={trainer.center_visit_available ? 'default' : 'secondary'}>
                        {trainer.center_visit_available ? '가능' : '불가능'}
                      </Badge>
                    </div>
                  </div>

                  {trainer.center_visit_available && trainer.center_name && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">센터 이름</p>
                      <p className="font-medium">{trainer.center_name}</p>
                    </div>
                  )}

                  {trainer.center_visit_available && trainer.center_address && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>센터 주소</span>
                      </div>
                      <p className="font-medium">{trainer.center_address}</p>
                    </div>
                  )}

                  {trainer.service_areas && trainer.service_areas.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">서비스 지역</p>
                      <div className="flex flex-wrap gap-2">
                        {trainer.service_areas.map((area, idx) => (
                          <Badge key={idx} variant="outline">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {trainer.max_group_size && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">최대 그룹 인원</p>
                      <p className="font-medium">{trainer.max_group_size}명</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  )
}
