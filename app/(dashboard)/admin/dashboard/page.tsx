import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'admin') {
    redirect('/')
  }

  // 통계 데이터 가져오기
  const { count: totalTrainers } = await supabase
    .from('trainers')
    .select('*', { count: 'exact', head: true })

  const { count: pendingTrainers } = await supabase
    .from('trainers')
    .select('*', { count: 'exact', head: true })
    .eq('is_verified', false)

  const { count: activeTrainers } = await supabase
    .from('trainers')
    .select('*', { count: 'exact', head: true })
    .eq('is_verified', true)
    .eq('is_active', true)

  const { count: totalCustomers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('user_type', 'customer')

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">관리자 대시보드</h1>
        <p className="text-gray-600">
          안녕하세요, {profile?.full_name}님
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">전체 트레이너</p>
              <p className="text-3xl font-bold">{totalTrainers || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👨‍⚕️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">승인 대기</p>
              <p className="text-3xl font-bold text-yellow-600">{pendingTrainers || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">활동 중</p>
              <p className="text-3xl font-bold text-green-600">{activeTrainers || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">고객 수</p>
              <p className="text-3xl font-bold">{totalCustomers || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>
      </div>

      {/* 빠른 액션 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">빠른 액션</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/trainers"
            className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-xl">👨‍⚕️</span>
            </div>
            <div>
              <h3 className="font-semibold">트레이너 관리</h3>
              <p className="text-sm text-gray-500">승인 및 Sanity 게시</p>
            </div>
          </Link>

          <a
            href="http://localhost:3333/senior-care"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-xl">📝</span>
            </div>
            <div>
              <h3 className="font-semibold">Sanity Studio</h3>
              <p className="text-sm text-gray-500">CMS 관리</p>
            </div>
          </a>

          <Link
            href="/admin/bookings"
            className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-xl">📅</span>
            </div>
            <div>
              <h3 className="font-semibold">예약 관리</h3>
              <p className="text-sm text-gray-500">예약 현황 확인</p>
            </div>
          </Link>
        </div>
      </div>

      {/* 최근 활동 (선택사항) */}
      {pendingTrainers && pendingTrainers > 0 && (
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            ⚠️ 승인 대기 중인 트레이너가 있습니다
          </h3>
          <p className="text-yellow-700 mb-4">
            {pendingTrainers}명의 트레이너가 승인을 기다리고 있습니다.
          </p>
          <Link
            href="/admin/trainers"
            className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            지금 확인하기 →
          </Link>
        </div>
      )}
    </div>
  )
}
