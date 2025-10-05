import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { CustomerProfileForm } from '@/components/customer-profile-form'

export default async function CustomerSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'customer') redirect('/')

  // Get customer details (docs/DATABASE_SCHEMA.md 참조)
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  return (
    <>
      {/* Header */}
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
                <BreadcrumbPage>설정</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">프로필 설정</h1>
          <p className="text-muted-foreground mt-1">
            개인 정보와 건강 상태를 관리하세요
          </p>
        </div>

        <div className="grid gap-6 max-w-4xl">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>
                이름, 연락처 등 기본 정보를 수정할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomerProfileForm
                profile={profile}
                customer={customer}
              />
            </CardContent>
          </Card>

          {/* 계정 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>계정 정보</CardTitle>
              <CardDescription>
                이메일 및 비밀번호 관리
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  이메일
                </label>
                <p className="text-base mt-1">{user.email}</p>
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  가입일
                </label>
                <p className="text-base mt-1">
                  {new Date(user.created_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
