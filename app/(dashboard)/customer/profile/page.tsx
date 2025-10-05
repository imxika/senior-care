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

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">내 프로필</h1>
          <p className="text-muted-foreground mt-1">프로필 정보를 확인하고 수정하세요</p>
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

          {/* 고객 상세 정보 */}
          {customer && (
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>상세 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">나이</p>
                    <p className="font-medium">{customer.age ? `${customer.age}세` : '미등록'}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">성별</p>
                    <p className="font-medium">
                      {customer.gender === 'male' ? '남성' : customer.gender === 'female' ? '여성' : '기타'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">거동 수준</p>
                    <Badge variant="outline">
                      {customer.mobility_level === 'independent' ? '독립적' :
                       customer.mobility_level === 'assisted' ? '보조 필요' :
                       customer.mobility_level === 'wheelchair' ? '휠체어' :
                       customer.mobility_level === 'bedridden' ? '와상' : '미등록'}
                    </Badge>
                  </div>
                </div>

                {customer.address && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>주소</span>
                    </div>
                    <p className="font-medium">
                      {customer.address}
                      {customer.address_detail && ` ${customer.address_detail}`}
                    </p>
                  </div>
                )}

                {customer.emergency_contact && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">비상 연락처 이름</p>
                      <p className="font-medium">{customer.emergency_contact}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">비상 연락처 전화번호</p>
                      <p className="font-medium">{customer.emergency_phone}</p>
                    </div>
                  </div>
                )}

                {customer.medical_conditions && customer.medical_conditions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">건강 상태</p>
                    <div className="flex flex-wrap gap-2">
                      {customer.medical_conditions.map((condition, idx) => (
                        <Badge key={idx} variant="secondary">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {customer.notes && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">특이사항</p>
                    <p className="text-sm">{customer.notes}</p>
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
