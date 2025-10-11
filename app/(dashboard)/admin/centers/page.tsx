import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Building2, MapPin, Phone, CheckCircle, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'

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
    }
  }
}

export default async function AdminCentersPage() {
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

  // 모든 센터 조회 (owner_id로 조인)
  const { data: centers, error } = await serviceSupabase
    .from('centers')
    .select(`
      *,
      owner:trainers!owner_id(
        id,
        profile:profiles!profile_id(
          full_name,
          email
        )
      )
    `)
    .order('created_at', { ascending: false }) as { data: Center[] | null; error: Error | null }

  if (error) {
    console.error('센터 조회 오류:', error)
  }

  // 승인 대기 중인 센터
  const pendingCenters = centers?.filter(c => !c.is_verified) || []
  const verifiedCenters = centers?.filter(c => c.is_verified) || []

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
                <BreadcrumbPage>센터 관리</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">센터 관리</h1>
            <p className="text-muted-foreground mt-2">
              트레이너 센터 등록 요청을 승인하고 상세 정보를 관리합니다.
            </p>
          </div>
        </div>

        {/* 승인 대기 중 */}
        {pendingCenters.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              승인 대기 중 ({pendingCenters.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingCenters.map(center => (
                <CenterCard key={center.id} center={center} isPending />
              ))}
            </div>
          </div>
        )}

        {/* 승인된 센터 */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            승인된 센터 ({verifiedCenters.length})
          </h2>
          {verifiedCenters.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {verifiedCenters.map(center => (
                <CenterCard key={center.id} center={center} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                승인된 센터가 없습니다.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

function CenterCard({ center, isPending = false }: { center: Center; isPending?: boolean }) {
  return (
    <Card className={isPending ? 'border-orange-200 bg-orange-50/50' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {center.name}
              <span className="text-xs font-mono text-muted-foreground font-normal">
                #{center.id.substring(0, 6).toUpperCase()}
              </span>
            </CardTitle>
            {center.owner?.profile && (
              <p className="text-xs text-muted-foreground mt-1">
                소유자: {center.owner.profile.full_name}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {isPending ? (
              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                승인 대기
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                승인 완료
              </Badge>
            )}
            {!center.is_active && (
              <Badge variant="outline" className="bg-gray-100 text-gray-700">
                비활성
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span className="flex-1">{center.address}</span>
          </div>
          {center.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{center.phone}</span>
            </div>
          )}
          {center.business_registration_number && (
            <div className="text-xs text-muted-foreground">
              사업자번호: {center.business_registration_number}
            </div>
          )}
        </div>

        <Link href={`/admin/centers/${center.id}`} className="block">
          <Button className="w-full" variant={isPending ? 'default' : 'outline'}>
            {isPending ? '승인 처리' : '상세 보기'}
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
