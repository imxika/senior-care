import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BecomeTrainerForm } from '@/components/become-trainer-form'

export default async function BecomeTrainerPage() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // 프로필 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 이미 트레이너인 경우
  if (profile?.user_type === 'trainer') {
    redirect('/trainer')
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-2xl">
      <Card>
        <CardHeader className="space-y-2 md:space-y-1.5">
          <CardTitle className="text-2xl md:text-3xl">트레이너 전환 신청</CardTitle>
          <CardDescription className="text-base">
            트레이너로 전환하여 서비스를 제공하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h3 className="font-bold text-lg mb-3">트레이너 혜택</h3>
              <ul className="space-y-2.5 text-base text-muted-foreground">
                <li className="flex items-start">
                  <span className="mr-2 text-lg">✓</span>
                  <span>고객에게 재활 서비스 제공</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-lg">✓</span>
                  <span>일정 관리 및 예약 시스템</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-lg">✓</span>
                  <span>수익 관리 및 통계</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-lg">✓</span>
                  <span>전문적인 프로필 관리</span>
                </li>
              </ul>
            </div>

            <BecomeTrainerForm userId={user.id} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
