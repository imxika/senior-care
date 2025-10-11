import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Building2, MapPin, Phone, FileText, Calendar, User } from 'lucide-react'
import { ApprovalActions } from './approval-actions'

interface PageProps {
  params: Promise<{ id: string }>
}

interface Center {
  id: string
  name: string
  address: string
  phone?: string
  business_registration_number?: string
  description?: string
  is_verified: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  owner?: {
    id: string
    profile?: {
      full_name: string
      email: string
      phone?: string
    }
  }
}

export default async function CenterDetailPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()

  // 인증 및 권한 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'admin') {
    redirect('/')
  }

  // Service Role client for RLS bypass
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // 센터 상세 정보 조회
  const { data: center, error } = await serviceSupabase
    .from('centers')
    .select(`
      *,
      owner:trainers!owner_id(
        id,
        profile:profiles!profile_id(
          full_name,
          email,
          phone
        )
      )
    `)
    .eq('id', id)
    .single() as { data: Center | null; error: Error | null }

  if (error || !center) {
    redirect('/admin/centers')
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
                <BreadcrumbLink href="/admin/dashboard">관리자</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/centers">센터 관리</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{center.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <Building2 className="h-8 w-8" />
                {center.name}
                <span className="text-lg font-mono text-muted-foreground font-normal">
                  #{center.id.substring(0, 6).toUpperCase()}
                </span>
              </h1>
              <p className="text-muted-foreground mt-2">
                센터 상세 정보 및 승인 관리
              </p>
            </div>
            <div className="flex gap-2">
              {center.is_verified ? (
                <Badge className="bg-green-100 text-green-700 border-green-300">
                  ✓ 승인 완료
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                  ⏳ 승인 대기
                </Badge>
              )}
              {!center.is_active && (
                <Badge variant="outline" className="bg-gray-100 text-gray-700">
                  비활성
                </Badge>
              )}
            </div>
          </div>

          {/* 센터 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>센터 정보</CardTitle>
              <CardDescription>트레이너가 등록한 센터 정보입니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    주소
                  </div>
                  <p className="text-sm pl-6">{center.address}</p>
                </div>

                {center.phone && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      전화번호
                    </div>
                    <p className="text-sm pl-6">{center.phone}</p>
                  </div>
                )}

                {center.business_registration_number && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      사업자등록번호
                    </div>
                    <p className="text-sm pl-6 font-mono">{center.business_registration_number}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    등록일
                  </div>
                  <p className="text-sm pl-6">
                    {new Date(center.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {center.description && (
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground">센터 소개</p>
                  <p className="text-sm pl-6 whitespace-pre-wrap">{center.description}</p>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  센터 ID: <span className="font-mono">{center.id}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 소유자 정보 */}
          {center.owner?.profile && (
            <Card>
              <CardHeader>
                <CardTitle>소유자 정보</CardTitle>
                <CardDescription>센터를 등록한 트레이너의 정보입니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <User className="h-4 w-4" />
                      이름
                    </div>
                    <p className="text-sm pl-6">{center.owner.profile.full_name}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      이메일
                    </div>
                    <p className="text-sm pl-6">{center.owner.profile.email}</p>
                  </div>

                  {center.owner.profile.phone && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        전화번호
                      </div>
                      <p className="text-sm pl-6">{center.owner.profile.phone}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    트레이너 ID: <span className="font-mono">{center.owner.id}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 승인/거부 액션 */}
          {!center.is_verified && (
            <ApprovalActions centerId={center.id} centerName={center.name} />
          )}

          {center.is_verified && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <p className="text-sm text-green-700">
                  ✓ 이 센터는 이미 승인되었습니다. 승인된 센터는 수정하거나 거부할 수 없습니다.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
