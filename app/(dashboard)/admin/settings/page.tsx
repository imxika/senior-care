import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NotificationSettingsForm } from './notification-settings-form'

export default async function AdminSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 관리자 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'admin') {
    redirect('/')
  }

  // 현재 알림 설정 가져오기
  const { data: settings } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">관리자 설정</h1>
        <p className="text-muted-foreground mt-2">
          알림 및 시스템 설정을 관리합니다
        </p>
      </div>

      <div className="space-y-6">
        {/* 알림 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>알림 설정</CardTitle>
            <CardDescription>
              받고 싶은 알림 유형을 선택하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationSettingsForm currentSettings={settings} />
          </CardContent>
        </Card>

        {/* 향후 추가될 설정들 */}
        {/* <Card>
          <CardHeader>
            <CardTitle>시스템 설정</CardTitle>
            <CardDescription>
              시스템 전반의 설정을 관리합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            향후 추가 예정
          </CardContent>
        </Card> */}
      </div>
    </div>
  )
}
