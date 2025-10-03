'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Calendar, Star } from 'lucide-react'

interface Profile {
  id: string
  user_type: string
  full_name: string
  phone: string | null
}

interface Customer {
  id: string
  age: number | null
  gender: string | null
  address: string | null
  address_detail: string | null
  mobility_level: string | null
}

export default function CustomerDashboard() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    const init = async () => {
      await loadProfile()
    }
    init()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('profile_id', user.id)
      .single()

    setProfile(profileData)
    setCustomer(customerData)
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 헤더 */}
        <div>
          <h1 className="text-3xl md:text-5xl font-bold">고객 대시보드</h1>
          <p className="text-lg md:text-xl text-muted-foreground mt-2">
            안녕하세요, {profile?.full_name}님
          </p>
        </div>

        {/* 프로필 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <User className="w-6 h-6 text-primary" />
              내 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-base md:text-lg">
            <p><strong>나이:</strong> {customer?.age}세</p>
            <p><strong>성별:</strong> {customer?.gender === 'male' ? '남성' : customer?.gender === 'female' ? '여성' : '기타'}</p>
            <p><strong>주소:</strong> {customer?.address} {customer?.address_detail}</p>
            <p><strong>거동 능력:</strong> {
              customer?.mobility_level === 'independent' ? '독립적' :
              customer?.mobility_level === 'assisted' ? '보조 필요' :
              customer?.mobility_level === 'wheelchair' ? '휠체어 사용' :
              customer?.mobility_level === 'bedridden' ? '와상 상태' : '-'
            }</p>
          </CardContent>
        </Card>

        {/* 빠른 액션 */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Calendar className="w-6 h-6 text-primary" />
                트레이너 찾기
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                나에게 맞는 전문 트레이너를 찾아보세요
              </p>
              <Button className="w-full mt-4" size="lg">
                검색하기
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Calendar className="w-6 h-6 text-primary" />
                내 예약
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                예약 내역을 확인하고 관리하세요
              </p>
              <Button className="w-full mt-4" variant="outline" size="lg">
                보기
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Star className="w-6 h-6 text-primary" />
                리뷰 작성
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                받은 서비스에 대한 리뷰를 남겨주세요
              </p>
              <Button className="w-full mt-4" variant="outline" size="lg">
                작성하기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
