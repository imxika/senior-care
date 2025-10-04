import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin-sidebar'
import { TrainerSidebar } from '@/components/trainer-sidebar'
import { CustomerSidebar } from '@/components/customer-sidebar'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  const userData = {
    name: profile.full_name || 'User',
    email: profile.email || user.email || '',
  }

  // 사용자 타입에 따라 다른 사이드바 표시
  let SidebarComponent
  switch (profile.user_type) {
    case 'admin':
      SidebarComponent = AdminSidebar
      break
    case 'trainer':
      SidebarComponent = TrainerSidebar
      break
    case 'customer':
      SidebarComponent = CustomerSidebar
      break
    default:
      redirect('/')
  }

  return (
    <SidebarProvider>
      <SidebarComponent user={userData} />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
