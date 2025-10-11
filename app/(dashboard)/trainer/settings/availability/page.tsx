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
import { AvailabilityContent } from './availability-content'

export default async function TrainerAvailabilityPage() {
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

  if (!trainer) {
    redirect('/trainer/settings')
  }

  // 기본 가능시간 조회 (trainer_availability 테이블)
  const { data: availabilities } = await supabase
    .from('trainer_availability')
    .select('*')
    .eq('trainer_id', trainer.id)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  // 예외 날짜 조회 (미래 날짜만, 90일까지)
  const today = new Date().toISOString().split('T')[0]
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 90) // 90일 후까지
  const maxDate = futureDate.toISOString().split('T')[0]

  const { data: exceptions } = await supabase
    .from('trainer_availability_exceptions')
    .select('*')
    .eq('trainer_id', trainer.id)
    .gte('date', today)
    .lte('date', maxDate)
    .order('date', { ascending: true })

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
                <BreadcrumbLink href="/trainer/settings">설정</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>가능시간 관리</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <AvailabilityContent
        trainer={trainer}
        availabilities={availabilities || []}
        exceptions={exceptions || []}
      />
    </>
  )
}
