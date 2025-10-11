import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PricingSettingsForm from './pricing-settings-form'
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

export default async function AdminPricingSettingsPage() {
  const supabase = await createClient()

  // Check authentication and admin role
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
    redirect('/dashboard')
  }

  // Fetch active pricing policy
  const { data: pricingPolicy, error } = await supabase
    .from('platform_pricing_policy')
    .select('*')
    .eq('is_active', true)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single()

  if (error || !pricingPolicy) {
    console.error('Error fetching pricing policy:', error)
    // Return page with error state
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/admin/settings">설정</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>가격 정책</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">가격 정책 설정</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              플랫폼 전체의 가격 정책을 관리합니다
            </p>
          </div>
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded max-w-4xl">
            <p className="font-semibold">오류 발생</p>
            <p className="text-sm">가격 정책을 불러올 수 없습니다.</p>
          </div>
        </div>
      </>
    )
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
                <BreadcrumbLink href="/admin/settings">설정</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>가격 정책</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">가격 정책 설정</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            플랫폼 전체의 가격 정책을 관리합니다. 변경 사항은 새로운 예약부터 적용됩니다.
          </p>
        </div>

        <div className="max-w-4xl">
          <PricingSettingsForm initialData={pricingPolicy} />
        </div>
      </div>
    </>
  )
}
