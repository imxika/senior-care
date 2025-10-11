import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TrainerPricingSettingsForm from './trainer-pricing-settings-form'
import { getTrainerPricing } from '@/lib/pricing-utils'
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

export default async function TrainerPricingSettingsPage() {
  const supabase = await createClient()

  // Check authentication and trainer role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'trainer') {
    redirect('/dashboard')
  }

  // Get trainer ID
  const { data: trainer } = await supabase
    .from('trainers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!trainer) {
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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/trainer/settings/profile">설정</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>가격 설정</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">가격 설정</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              나만의 가격을 설정하거나 플랫폼 기본 가격을 사용할 수 있습니다
            </p>
          </div>
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded max-w-4xl">
            <p className="font-semibold">오류 발생</p>
            <p className="text-sm">트레이너 정보를 찾을 수 없습니다.</p>
          </div>
        </div>
      </>
    )
  }

  // Fetch trainer pricing configuration
  const pricing = await getTrainerPricing(trainer.id)

  if (!pricing) {
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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/trainer/settings/profile">설정</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>가격 설정</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">가격 설정</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              나만의 가격을 설정하거나 플랫폼 기본 가격을 사용할 수 있습니다
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
                <BreadcrumbLink href="/trainer/dashboard">트레이너</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/trainer/settings/profile">설정</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>가격 설정</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">가격 설정</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            나만의 가격을 설정하거나 플랫폼 기본 가격을 사용할 수 있습니다.
          </p>
        </div>

        <div className="max-w-4xl">
          <TrainerPricingSettingsForm
            trainerId={trainer.id}
            config={pricing.config}
            policy={pricing.policy}
          />
        </div>
      </div>
    </>
  )
}
