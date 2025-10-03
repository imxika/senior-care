'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useState } from 'react'

export default function DebugPage() {
  const supabase = createClient()
  const [info, setInfo] = useState<any>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    console.log('🔍 Debug checkAuth called')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('🔍 Session:', session?.user?.email, 'Error:', sessionError)

    const user = session?.user

    let profile = null
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      profile = data
      console.log('🔍 Profile:', profile)
    }

    setInfo({
      user: user ? {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      } : null,
      session: session ? {
        access_token: session.access_token.substring(0, 20) + '...',
        expires_at: new Date(session.expires_at! * 1000).toLocaleString()
      } : null,
      profile
    })
    console.log('🔍 Info set:', { user: user?.email, profile: profile?.user_type })
  }

  const forceLogout = async () => {
    await supabase.auth.signOut()
    // 쿠키 완전 삭제
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
    })
    window.location.href = '/'
  }

  const createAdminProfile = async () => {
    if (!info?.user) {
      alert('먼저 회원가입/로그인을 해주세요')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: info.user.id,
        email: info.user.email,
        user_type: 'admin',
        full_name: 'Admin User',
        phone: '010-0000-0000'
      })

    if (error) {
      alert('에러: ' + error.message)
      console.error(error)
    } else {
      alert('✅ Admin 프로필 생성 완료! 이제 /admin/dashboard로 이동할 수 있습니다.')
      checkAuth()
      setTimeout(() => {
        window.location.href = '/admin/dashboard'
      }, 1500)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">🔍 인증 상태 디버그</h1>

        <Card>
          <CardHeader>
            <CardTitle>현재 인증 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-100 p-4 rounded-lg overflow-auto">
              {JSON.stringify(info, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button onClick={checkAuth} variant="outline">
            🔄 새로고침
          </Button>
          <Button onClick={forceLogout} variant="destructive">
            🚪 강제 로그아웃
          </Button>
          {info?.user && !info?.profile && (
            <Button onClick={createAdminProfile} className="bg-green-600">
              ✨ Admin 프로필 생성
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>해결 방법</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>1. 프로필 없음:</strong> "Admin 프로필 생성" 버튼 클릭</p>
            <p><strong>2. 이상한 세션:</strong> "강제 로그아웃" → 다시 로그인</p>
            <p><strong>3. 모든 쿠키 삭제:</strong> 브라우저 개발자도구 → Application → Cookies → 전체 삭제</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
