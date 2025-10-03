import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TrainersManagementTable from '@/components/admin/TrainersManagementTable'

export default async function AdminTrainersPage() {
  const supabase = await createClient()

  // 관리자 권한 확인
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
    redirect('/')
  }

  // 모든 트레이너 정보 가져오기
  const { data: trainers, error } = await supabase
    .from('trainers')
    .select(`
      *,
      profiles!trainers_profile_id_fkey (
        full_name,
        avatar_url,
        email,
        phone
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching trainers:', error)
    return <div>Error loading trainers</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">트레이너 관리</h1>
        <p className="text-gray-600">
          트레이너 승인 및 Sanity CMS 게시를 관리합니다
        </p>
      </div>

      <TrainersManagementTable trainers={trainers || []} />
    </div>
  )
}
