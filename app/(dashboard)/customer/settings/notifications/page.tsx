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

  if (profile?.user_type !== 'customer') {
    redirect('/customer/dashboard')
  }

  const { data: customer } = await supabase
    .from('customers')
    .select(`
      id,
      email_booking_notifications,
      email_review_notifications,
      email_marketing_notifications,
      push_booking_notifications,
      push_review_notifications
    `)
    .eq('profile_id', user.id)
    .single()

  if (!customer) {
    redirect('/customer/dashboard')
  }

  const initialSettings = {
    email_booking_notifications: customer.email_booking_notifications ?? true,
    email_review_notifications: customer.email_review_notifications ?? true,
    email_marketing_notifications: customer.email_marketing_notifications ?? false,
    push_booking_notifications: customer.push_booking_notifications ?? true,
    push_review_notifications: customer.push_review_notifications ?? true,
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
                <BreadcrumbLink href="/customer/dashboard">
                  고객
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/customer/settings">설정</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>알림</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-6 md:gap-8 md:p-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">알림 설정</h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            스위치를 켜거나 끄면 자동으로 저장됩니다
          </p>
        </div>
        <NotificationSettingsForm initialSettings={initialSettings} />
      </div>
    </>
  )
}
