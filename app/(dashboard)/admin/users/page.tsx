import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserManagementClient } from './user-management-client'
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

// 페이지 캐싱 비활성화 (항상 최신 데이터 표시)
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminUsersPage() {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Admin check
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'admin') {
    redirect('/')
  }

  // Get all users with admin client (RLS bypass)
  const adminClient = createAdminClient()

  // Get auth data (모든 auth.users 계정)
  const { data: authUsers } = await adminClient.auth.admin.listUsers()

  // Get profiles
  const { data: profiles } = await adminClient
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      user_type,
      created_at,
      customers (id),
      trainers (id)
    `)

  // Merge: auth.users 기준으로 모든 계정 표시
  const users = authUsers?.users.map(authUser => {
    const profile = profiles?.find(p => p.id === authUser.id)
    return {
      id: authUser.id,
      email: authUser.email || null,
      full_name: profile?.full_name || null,
      user_type: profile?.user_type || 'unknown',
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at || null,
      customers: profile?.customers || [],
      trainers: profile?.trainers || [],
      has_profile: !!profile,
    }
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || []

  return (
    <>
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
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
                <BreadcrumbPage>사용자 관리</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div>
          <h1 className="text-3xl font-bold">사용자 관리</h1>
          <p className="text-muted-foreground mt-2">
            모든 사용자를 조회하고 관리할 수 있습니다.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>전체 사용자 목록</CardTitle>
            <CardDescription>
              검색, 필터링, 삭제 기능 | 마지막 로그인 정보 포함
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserManagementClient users={users} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
