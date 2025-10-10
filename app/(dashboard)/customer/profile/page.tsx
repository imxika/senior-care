import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { User, Mail, Phone, MapPin, Calendar } from 'lucide-react'
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
import { calculateAge } from '@/lib/utils'

export default async function CustomerProfilePage() {
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

  if (profile?.user_type !== 'customer') {
    redirect('/')
  }

  // 고객 상세 정보 조회
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  // Debug log
  console.log('Customer data:', customer)
  console.log('Birth date:', customer?.birth_date)
  console.log('Age:', customer?.age)

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
                <BreadcrumbPage>프로필</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6 md:gap-8 md:p-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">내 프로필</h1>
          <p className="text-xl md:text-2xl text-muted-foreground">프로필 정보를 확인하고 수정하세요</p>
        </div>

        <div className="grid gap-5 md:gap-6 md:grid-cols-3">
          {/* 프로필 사진 - 시니어 친화적 */}
          <Card className="md:col-span-1 border-2">
            <CardHeader className="p-6">
              <CardTitle className="text-xl md:text-2xl">프로필 사진</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center p-6 pt-0">
              <AvatarUpload
                currentAvatarUrl={profile?.avatar_url}
                userId={user.id}
                userName={profile?.full_name}
              />
            </CardContent>
          </Card>

          {/* 기본 정보 - 시니어 친화적 */}
          <Card className="md:col-span-2 border-2">
            <CardHeader className="p-6">
              <CardTitle className="text-xl md:text-2xl">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-6 pt-0">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-base md:text-lg text-muted-foreground">
                    <User className="h-5 w-5" />
                    <span>이름</span>
                  </div>
                  <p className="font-medium text-lg md:text-xl">{profile?.full_name || '이름 없음'}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-base md:text-lg text-muted-foreground">
                    <Mail className="h-5 w-5" />
                    <span>이메일</span>
                  </div>
                  <p className="font-medium text-lg md:text-xl break-all">{profile?.email || '이메일 없음'}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-base md:text-lg text-muted-foreground">
                    <Phone className="h-5 w-5" />
                    <span>전화번호</span>
                  </div>
                  <p className="font-medium text-lg md:text-xl">{profile?.phone || '등록된 전화번호 없음'}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-base md:text-lg text-muted-foreground">
                    <Calendar className="h-5 w-5" />
                    <span>가입일</span>
                  </div>
                  <p className="font-medium text-lg md:text-xl">
                    {new Date(profile?.created_at || '').toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 고객 상세 정보 - 시니어 친화적 */}
          {customer && (
            <Card className="md:col-span-3 border-2">
              <CardHeader className="p-6">
                <CardTitle className="text-xl md:text-2xl">상세 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-6 pt-0">
                <div className="grid gap-5 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-base md:text-lg text-muted-foreground">생년월일</p>
                    <p className="font-medium text-lg md:text-xl">
                      {customer.birth_date
                        ? new Date(customer.birth_date).toLocaleDateString('ko-KR')
                        : '미등록'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-base md:text-lg text-muted-foreground">나이</p>
                    <p className="font-medium text-lg md:text-xl">
                      {calculateAge(customer.birth_date)
                        ? `만 ${calculateAge(customer.birth_date)}세`
                        : customer.age
                        ? `만 ${customer.age}세`
                        : '미등록'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-base md:text-lg text-muted-foreground">성별</p>
                    <p className="font-medium text-lg md:text-xl">
                      {customer.gender === 'male' ? '남성' :
                       customer.gender === 'female' ? '여성' :
                       customer.gender === 'other' ? '기타' : '미등록'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-base md:text-lg text-muted-foreground">거동 수준</p>
                    <Badge variant="outline" className="text-base px-3 py-1">
                      {customer.mobility_level === 'independent' ? '독립적' :
                       customer.mobility_level === 'assisted' ? '보조 필요' :
                       customer.mobility_level === 'wheelchair' ? '휠체어' :
                       customer.mobility_level === 'bedridden' ? '와상' : '미등록'}
                    </Badge>
                  </div>
                </div>

                {customer.address && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-base md:text-lg text-muted-foreground">
                      <MapPin className="h-5 w-5" />
                      <span>주소</span>
                    </div>
                    <p className="font-medium text-lg md:text-xl break-words">
                      {customer.address}
                      {customer.address_detail && ` ${customer.address_detail}`}
                    </p>
                  </div>
                )}

                {customer.guardian_name && (
                  <div className="space-y-4">
                    <p className="text-base md:text-lg font-semibold text-muted-foreground">보호자 정보</p>
                    <div className="grid gap-5 md:grid-cols-3">
                      <div className="space-y-2">
                        <p className="text-base md:text-lg text-muted-foreground">이름</p>
                        <p className="font-medium text-lg md:text-xl">{customer.guardian_name}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-base md:text-lg text-muted-foreground">관계</p>
                        <p className="font-medium text-lg md:text-xl">{customer.guardian_relationship}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-base md:text-lg text-muted-foreground">연락처</p>
                        <p className="font-medium text-lg md:text-xl">{customer.guardian_phone}</p>
                      </div>
                    </div>
                  </div>
                )}

                {customer.medical_conditions && customer.medical_conditions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-base md:text-lg text-muted-foreground">건강 상태</p>
                    <div className="flex flex-wrap gap-2">
                      {customer.medical_conditions.map((condition: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-base px-3 py-1">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {customer.notes && (
                  <div className="space-y-2">
                    <p className="text-base md:text-lg text-muted-foreground">특이사항</p>
                    <p className="text-base md:text-lg break-words">{customer.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
