'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { ArrowRight, Dumbbell, Award, MapPin, Home, Building, Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

export default function TrainerSetupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    bio: '',
    specialties: '',
    certifications: '',
    years_experience: '',
    hourly_rate: '',
    home_visit_available: true,
    center_visit_available: false,
    center_name: '',
    center_address: '',
    service_areas: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) throw new Error('프로필을 찾을 수 없습니다.')

      // Insert trainer data
      const { error } = await supabase
        .from('trainers')
        .insert({
          profile_id: profile.id,
          bio: formData.bio,
          specialties: formData.specialties ? formData.specialties.split(',').map(s => s.trim()) : null,
          certifications: formData.certifications ? formData.certifications.split(',').map(s => s.trim()) : null,
          years_experience: parseInt(formData.years_experience) || null,
          hourly_rate: parseInt(formData.hourly_rate) || null,
          home_visit_available: formData.home_visit_available,
          center_visit_available: formData.center_visit_available,
          center_name: formData.center_name || null,
          center_address: formData.center_address || null,
          service_areas: formData.service_areas ? formData.service_areas.split(',').map(s => s.trim()) : null,
          is_verified: false, // 관리자 승인 대기
          is_active: false
        })

      if (error) throw error

      // Show success message and redirect
      alert('트레이너 프로필이 생성되었습니다. 관리자 승인 후 서비스를 시작할 수 있습니다.')
      router.push('/trainer/dashboard')
    } catch (error) {
      console.error('Error creating trainer profile:', error)
      alert('프로필 생성 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-green-50 to-background">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 space-y-3">
          <h1 className="text-3xl md:text-5xl font-bold">트레이너 프로필 설정</h1>
          <p className="text-lg md:text-2xl text-muted-foreground">
            전문가 정보를 입력해주세요
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl flex items-center gap-3">
              <Dumbbell className="w-8 h-8 text-green-600" />
              전문가 정보
            </CardTitle>
            <CardDescription className="text-base md:text-lg">
              고객에게 보여질 프로필입니다
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 자기소개 */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-lg md:text-xl">
                  자기소개
                </Label>
                <Textarea
                  id="bio"
                  placeholder="안녕하세요. 10년 경력의 재활 전문 트레이너입니다..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  required
                  className="min-h-32 text-base md:text-lg"
                />
              </div>

              {/* 전문 분야 */}
              <div className="space-y-2">
                <Label htmlFor="specialties" className="text-lg md:text-xl">
                  전문 분야
                </Label>
                <Input
                  id="specialties"
                  placeholder="근력 강화, 균형 훈련, 관절 재활 (쉼표로 구분)"
                  value={formData.specialties}
                  onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                  className="h-12 md:h-14 text-base md:text-lg"
                />
              </div>

              {/* 자격증 */}
              <div className="space-y-2">
                <Label htmlFor="certifications" className="text-lg md:text-xl flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-600" />
                  자격증
                </Label>
                <Input
                  id="certifications"
                  placeholder="생활스포츠지도사, 물리치료사 (쉼표로 구분)"
                  value={formData.certifications}
                  onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                  className="h-12 md:h-14 text-base md:text-lg"
                />
              </div>

              {/* 경력 & 시간당 요금 */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="years_experience" className="text-lg md:text-xl">
                    경력 (년)
                  </Label>
                  <Input
                    id="years_experience"
                    type="number"
                    placeholder="10"
                    value={formData.years_experience}
                    onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                    className="h-12 md:h-14 text-base md:text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hourly_rate" className="text-lg md:text-xl">
                    기본 시급 (원)
                  </Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    placeholder="50000"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    className="h-12 md:h-14 text-base md:text-lg"
                  />
                </div>
              </div>

              {/* 서비스 타입 */}
              <div className="space-y-4">
                <Label className="text-lg md:text-xl">서비스 제공 방식</Label>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="home_visit"
                    checked={formData.home_visit_available}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, home_visit_available: checked as boolean })
                    }
                  />
                  <Label htmlFor="home_visit" className="text-base md:text-lg flex items-center gap-2 cursor-pointer">
                    <Home className="w-5 h-5 text-green-600" />
                    방문 재활 (고객 집 방문)
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="center_visit"
                    checked={formData.center_visit_available}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, center_visit_available: checked as boolean })
                    }
                  />
                  <Label htmlFor="center_visit" className="text-base md:text-lg flex items-center gap-2 cursor-pointer">
                    <Building className="w-5 h-5 text-green-600" />
                    센터 방문 (고객이 센터 방문)
                  </Label>
                </div>
              </div>

              {/* 센터 정보 (센터 방문 선택 시) */}
              {formData.center_visit_available && (
                <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="space-y-2">
                    <Label htmlFor="center_name" className="text-lg md:text-xl">
                      센터 이름
                    </Label>
                    <Input
                      id="center_name"
                      placeholder="건강 재활 센터"
                      value={formData.center_name}
                      onChange={(e) => setFormData({ ...formData, center_name: e.target.value })}
                      className="h-12 md:h-14 text-base md:text-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="center_address" className="text-lg md:text-xl">
                      센터 주소
                    </Label>
                    <Input
                      id="center_address"
                      placeholder="서울시 강남구 테헤란로 123"
                      value={formData.center_address}
                      onChange={(e) => setFormData({ ...formData, center_address: e.target.value })}
                      className="h-12 md:h-14 text-base md:text-lg"
                    />
                  </div>
                </div>
              )}

              {/* 서비스 가능 지역 */}
              <div className="space-y-2">
                <Label htmlFor="service_areas" className="text-lg md:text-xl flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-600" />
                  서비스 가능 지역
                </Label>
                <Input
                  id="service_areas"
                  placeholder="강남구, 서초구, 송파구 (쉼표로 구분)"
                  value={formData.service_areas}
                  onChange={(e) => setFormData({ ...formData, service_areas: e.target.value })}
                  className="h-12 md:h-14 text-base md:text-lg"
                />
              </div>

              {/* 안내 메시지 */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm md:text-base text-amber-800">
                  ⚠️ 프로필 등록 후 관리자 승인이 필요합니다. 승인 완료 시 이메일로 알려드립니다.
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-16 md:h-20 text-xl md:text-2xl font-bold bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 md:w-8 md:h-8 mr-3 animate-spin" />
                    등록 중...
                  </>
                ) : (
                  <>
                    등록 신청하기
                    <ArrowRight className="w-6 h-6 md:w-8 md:h-8 ml-3" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
