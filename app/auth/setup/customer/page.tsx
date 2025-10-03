'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { ArrowRight, User, MapPin, Phone, Heart } from 'lucide-react'

export default function CustomerSetupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    age: '',
    gender: 'male' as 'male' | 'female' | 'other',
    address: '',
    address_detail: '',
    emergency_contact: '',
    emergency_phone: '',
    mobility_level: 'independent' as 'independent' | 'assisted' | 'wheelchair' | 'bedridden',
    medical_conditions: '',
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      // Get the customer's profile_id from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) throw new Error('프로필을 찾을 수 없습니다.')

      // Insert customer data
      const { error } = await supabase
        .from('customers')
        .insert({
          profile_id: profile.id,
          age: parseInt(formData.age) || null,
          gender: formData.gender,
          address: formData.address,
          address_detail: formData.address_detail,
          emergency_contact: formData.emergency_contact,
          emergency_phone: formData.emergency_phone,
          mobility_level: formData.mobility_level,
          medical_conditions: formData.medical_conditions ? formData.medical_conditions.split(',').map(s => s.trim()) : null,
          notes: formData.notes
        })

      if (error) throw error

      // Redirect to customer dashboard
      router.push('/customer/dashboard')
    } catch (error) {
      console.error('Error creating customer profile:', error)
      alert('프로필 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-primary/5 to-background">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 space-y-3">
          <h1 className="text-3xl md:text-5xl font-bold">프로필 설정</h1>
          <p className="text-lg md:text-2xl text-muted-foreground">
            고객님의 정보를 입력해주세요
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl flex items-center gap-3">
              <User className="w-8 h-8 text-primary" />
              기본 정보
            </CardTitle>
            <CardDescription className="text-base md:text-lg">
              서비스 제공을 위해 필요한 정보입니다
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 나이 & 성별 */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-lg md:text-xl">
                    나이
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="65"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="h-12 md:h-14 text-base md:text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-lg md:text-xl">
                    성별
                  </Label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | 'other' })}
                    className="w-full h-12 md:h-14 text-base md:text-lg rounded-md border border-input bg-background px-3"
                  >
                    <option value="male">남성</option>
                    <option value="female">여성</option>
                    <option value="other">기타</option>
                  </select>
                </div>
              </div>

              {/* 주소 */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-lg md:text-xl flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  주소
                </Label>
                <Input
                  id="address"
                  placeholder="서울시 강남구 테헤란로 123"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="h-12 md:h-14 text-base md:text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_detail" className="text-lg md:text-xl">
                  상세 주소
                </Label>
                <Input
                  id="address_detail"
                  placeholder="101동 1001호"
                  value={formData.address_detail}
                  onChange={(e) => setFormData({ ...formData, address_detail: e.target.value })}
                  className="h-12 md:h-14 text-base md:text-lg"
                />
              </div>

              {/* 긴급 연락처 */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact" className="text-lg md:text-xl flex items-center gap-2">
                    <Phone className="w-5 h-5 text-primary" />
                    긴급 연락처 이름
                  </Label>
                  <Input
                    id="emergency_contact"
                    placeholder="김철수 (아들)"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                    className="h-12 md:h-14 text-base md:text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_phone" className="text-lg md:text-xl">
                    긴급 연락처 전화번호
                  </Label>
                  <Input
                    id="emergency_phone"
                    type="tel"
                    placeholder="010-1234-5678"
                    value={formData.emergency_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                    className="h-12 md:h-14 text-base md:text-lg"
                  />
                </div>
              </div>

              {/* 거동 능력 */}
              <div className="space-y-2">
                <Label htmlFor="mobility_level" className="text-lg md:text-xl">
                  거동 능력
                </Label>
                <select
                  id="mobility_level"
                  value={formData.mobility_level}
                  onChange={(e) => setFormData({ ...formData, mobility_level: e.target.value as 'independent' | 'assisted' | 'wheelchair' | 'bedridden' })}
                  className="w-full h-12 md:h-14 text-base md:text-lg rounded-md border border-input bg-background px-3"
                >
                  <option value="independent">독립적 (혼자 가능)</option>
                  <option value="assisted">보조 필요</option>
                  <option value="wheelchair">휠체어 사용</option>
                  <option value="bedridden">와상 상태</option>
                </select>
              </div>

              {/* 질병/건강 상태 */}
              <div className="space-y-2">
                <Label htmlFor="medical_conditions" className="text-lg md:text-xl flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  질병 및 건강 상태 (선택)
                </Label>
                <Input
                  id="medical_conditions"
                  placeholder="고혈압, 당뇨, 관절염 (쉼표로 구분)"
                  value={formData.medical_conditions}
                  onChange={(e) => setFormData({ ...formData, medical_conditions: e.target.value })}
                  className="h-12 md:h-14 text-base md:text-lg"
                />
              </div>

              {/* 추가 메모 */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-lg md:text-xl">
                  추가 메모 (선택)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="트레이너가 알아야 할 특이사항이나 요청사항을 작성해주세요"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="min-h-32 text-base md:text-lg"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-16 md:h-20 text-xl md:text-2xl font-bold"
                size="lg"
              >
                완료하기
                <ArrowRight className="w-6 h-6 md:w-8 md:h-8 ml-3" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
