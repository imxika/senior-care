import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { NotificationSettingsForm } from './notifications-form'

export default async function NotificationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/signin')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'trainer') {
    redirect('/dashboard')
  }

  const { data: trainer } = await supabase
    .from('trainers')
    .select(`
      id,
      email_booking_notifications,
      email_review_notifications,
      email_payment_notifications,
      email_marketing_notifications,
      push_booking_notifications,
      push_review_notifications,
      push_payment_notifications
    `)
    .eq('profile_id', user.id)
    .single()

  if (!trainer) {
    redirect('/trainer/dashboard')
  }

  const initialSettings = {
    email_booking_notifications: trainer.email_booking_notifications ?? true,
    email_review_notifications: trainer.email_review_notifications ?? true,
    email_payment_notifications: trainer.email_payment_notifications ?? true,
    email_marketing_notifications: trainer.email_marketing_notifications ?? false,
    push_booking_notifications: trainer.push_booking_notifications ?? true,
    push_review_notifications: trainer.push_review_notifications ?? true,
    push_payment_notifications: trainer.push_payment_notifications ?? true,
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/trainer/dashboard">
                  트레이너
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">설정</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>알림</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="space-y-4 md:space-y-6">
          <div>
            <h3 className="text-lg md:text-xl font-medium">알림 설정</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              스위치를 켜거나 끄면 자동으로 저장됩니다
            </p>
          </div>
          <Separator />
          <NotificationSettingsForm initialSettings={initialSettings} />
        </div>
      </div>
    </>
  )
}
