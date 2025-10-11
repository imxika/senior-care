import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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
import { CenterForm } from './center-form'

export default async function TrainerCenterPage() {
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

  // 트레이너 정보 조회
  const { data: trainer } = await supabase
    .from('trainers')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  // 소유한 센터 목록 조회 (최대 3개)
  const { data: ownedCenters } = await supabase
    .from('centers')
    .select('*')
    .eq('owner_id', trainer?.id)
    .order('created_at', { ascending: false })

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
                <BreadcrumbLink href="/trainer/settings">설정</BreadcrumbLink>
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
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">센터 관리</h1>
            <p className="text-muted-foreground mt-2">
              센터 방문 서비스를 제공하는 경우 센터 정보를 등록해주세요. (최대 3개)
            </p>
            {ownedCenters && ownedCenters.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                등록된 센터: {ownedCenters.length}/3개
              </p>
            )}
          </div>

          <CenterForm
            trainerId={trainer?.id}
            ownedCenters={ownedCenters || []}
          />
        </div>
      </div>
    </>
  )
}
