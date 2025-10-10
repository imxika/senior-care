'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Save, X } from 'lucide-react'
import { updateTrainerProfile } from './actions'
import { toast } from 'sonner'

// 정형화된 전문분야 카테고리
const SPECIALTY_OPTIONS = [
  '재활 PT',
  '개인 PT',
  '스트레칭/관절운동',
  '보행훈련',
  '요가',
  '필라테스',
  '실버 댄스',
]

interface ProfileEditFormProps {
  profile: any
  trainer: any
  isEditing: boolean
  setIsEditing: (value: boolean) => void
}

export function ProfileEditForm({ profile, trainer, isEditing, setIsEditing }: ProfileEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [maxGroupSizeError, setMaxGroupSizeError] = useState<string | null>(null)

  // 기본 정보
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')

  // 트레이너 정보 - 숫자는 문자열로 관리
  const [yearsExperience, setYearsExperience] = useState(trainer?.years_experience?.toString() || '')
  const [hourlyRate, setHourlyRate] = useState(trainer?.hourly_rate?.toString() || '')
  const [bio, setBio] = useState(trainer?.bio || '')
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(
    trainer?.specialties || []
  )
  const [otherSpecialty, setOtherSpecialty] = useState('')
  const [certificationsInput, setCertificationsInput] = useState(
    trainer?.certifications?.join(', ') || ''
  )
  const [serviceAreasInput, setServiceAreasInput] = useState(
    trainer?.service_areas?.join(', ') || ''
  )
  const [maxGroupSize, setMaxGroupSize] = useState(trainer?.max_group_size?.toString() || '')
  const [homeVisitAvailable, setHomeVisitAvailable] = useState(trainer?.home_visit_available ?? true)
  const [centerVisitAvailable, setCenterVisitAvailable] = useState(trainer?.center_visit_available ?? true)
  const [centerName, setCenterName] = useState(trainer?.center_name || '')
  const [centerAddress, setCenterAddress] = useState(trainer?.center_address || '')
  const [centerPhone, setCenterPhone] = useState(trainer?.center_phone || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMaxGroupSizeError(null)

    // 클라이언트 사이드 검증
    const groupSize = parseInt(maxGroupSize || '1')
    if (groupSize < 1 || groupSize > 3) {
      setMaxGroupSizeError('1명에서 3명 사이여야 합니다')
      setLoading(false)
      return
    }

    // 최소 1개 이상의 서비스 선택 검증
    if (!homeVisitAvailable && !centerVisitAvailable) {
      setError('최소 1개 이상의 서비스를 선택해주세요')
      setLoading(false)
      return
    }

    // 센터 방문 선택 시 센터 이름 필수 검증
    if (centerVisitAvailable && !centerName.trim()) {
      setError('센터 방문 서비스를 선택하셨습니다. 센터 이름을 입력해주세요.')
      setLoading(false)
      return
    }

    const formData = new FormData()
    // 기타 전문분야가 있으면 추가
    const finalSpecialties = [...selectedSpecialties]
    if (otherSpecialty.trim()) {
      finalSpecialties.push(`기타: ${otherSpecialty.trim()}`)
    }

    formData.append('full_name', fullName)
    formData.append('phone', phone)
    formData.append('years_experience', yearsExperience || '0')
    formData.append('hourly_rate', hourlyRate || '0')
    formData.append('bio', bio)
    formData.append('specialties', finalSpecialties.join(', '))
    formData.append('certifications', certificationsInput)
    formData.append('service_areas', serviceAreasInput)
    formData.append('max_group_size', maxGroupSize || '1')
    formData.append('home_visit_available', homeVisitAvailable.toString())
    formData.append('center_visit_available', centerVisitAvailable.toString())
    formData.append('center_name', centerName)
    formData.append('center_address', centerAddress)
    formData.append('center_phone', centerPhone)

    const result = await updateTrainerProfile(formData)

    if (result.error) {
      setError(result.error)
      toast.error('프로필 업데이트 실패', {
        description: result.error
      })
      setLoading(false)
    } else {
      setLoading(false)
      setIsEditing(false)
      toast.success('프로필이 성공적으로 업데이트되었습니다')
      router.refresh()
    }
  }

  const toggleSpecialty = (specialty: string) => {
    setSelectedSpecialties(prev =>
      prev.includes(specialty)
        ? prev.filter(s => s !== specialty)
        : [...prev, specialty]
    )
  }

  const handleCancel = () => {
    // 원래 값으로 되돌리기
    setFullName(profile?.full_name || '')
    setPhone(profile?.phone || '')
    setYearsExperience(trainer?.years_experience?.toString() || '')
    setHourlyRate(trainer?.hourly_rate?.toString() || '')
    setBio(trainer?.bio || '')
    setSelectedSpecialties(trainer?.specialties || [])
    setOtherSpecialty('')
    setCertificationsInput(trainer?.certifications?.join(', ') || '')
    setServiceAreasInput(trainer?.service_areas?.join(', ') || '')
    setMaxGroupSize(trainer?.max_group_size?.toString() || '')
    setHomeVisitAvailable(trainer?.home_visit_available ?? true)
    setCenterVisitAvailable(trainer?.center_visit_available ?? true)
    setCenterName(trainer?.center_name || '')
    setCenterAddress(trainer?.center_address || '')
    setCenterPhone(trainer?.center_phone || '')
    setIsEditing(false)
    setError(null)
    setMaxGroupSizeError(null)
  }

  return (
    <>
      {/* 전역 에러 메시지 */}
      {error && (
        <div className="mb-3 md:mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-xs md:text-sm text-destructive">{error}</p>
        </div>
      )}

      <form id="profile-form" onSubmit={handleSubmit}>
        <div className="grid gap-3 md:gap-6 md:grid-cols-3">
          {/* 기본 정보 */}
          <Card className="md:col-span-3 bg-muted/30">
            <CardHeader className="px-4 md:px-6 pt-4 md:pt-6">
              <CardTitle className="text-base md:text-lg">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6 pb-4 md:pb-6">
              <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm">이름</Label>
                  {isEditing ? (
                    <Input
                      id="full_name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-12 md:h-11 text-base"
                      required
                    />
                  ) : (
                    <p className="font-medium text-sm md:text-base">{fullName || '이름 없음'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">이메일</Label>
                  <p className="font-medium text-sm md:text-base break-all text-muted-foreground">
                    {profile?.email || '이메일 없음'}
                  </p>
                  <p className="text-xs text-muted-foreground">이메일은 수정할 수 없습니다</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm">전화번호</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010-0000-0000"
                      className="h-12 md:h-11 text-base"
                    />
                  ) : (
                    <p className="font-medium text-sm md:text-base">{phone || '등록된 전화번호 없음'}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 전문 정보 */}
          <Card className="md:col-span-3 bg-muted/30">
            <CardHeader className="px-4 md:px-6 pt-4 md:pt-6">
              <CardTitle className="text-base md:text-lg">전문 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6 pb-4 md:pb-6">
              <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="years_experience" className="text-sm">경력 (년)</Label>
                  {isEditing ? (
                    <Input
                      id="years_experience"
                      type="number"
                      min="0"
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(e.target.value)}
                      placeholder="0"
                      className="h-12 md:h-11 text-base"
                    />
                  ) : (
                    <p className="font-medium text-sm md:text-base">{yearsExperience || 0}년</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hourly_rate" className="text-sm">시간당 요금 (원)</Label>
                  {isEditing ? (
                    <Input
                      id="hourly_rate"
                      type="number"
                      min="0"
                      step="1000"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder="0"
                      className="h-12 md:h-11 text-base"
                    />
                  ) : (
                    <p className="font-medium text-sm md:text-base">{Number(hourlyRate || 0).toLocaleString()}원</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_group_size" className="text-sm">최대 그룹 인원</Label>
                  {isEditing ? (
                    <>
                      <Input
                        id="max_group_size"
                        type="number"
                        min="1"
                        max="3"
                        value={maxGroupSize}
                        onChange={(e) => {
                          setMaxGroupSize(e.target.value)
                          setMaxGroupSizeError(null)
                        }}
                        placeholder="1"
                        className={`h-12 md:h-11 text-base ${maxGroupSizeError ? 'border-destructive' : ''}`}
                      />
                      {maxGroupSizeError && (
                        <p className="text-xs text-destructive">{maxGroupSizeError}</p>
                      )}
                    </>
                  ) : (
                    <p className="font-medium text-sm md:text-base">{maxGroupSize || 1}명</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="bio" className="text-sm">소개</Label>
                {isEditing ? (
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="자신을 소개하는 글을 작성하세요"
                    rows={4}
                    className="resize-none text-base min-h-[120px]"
                  />
                ) : (
                  <p className="text-sm md:text-base">{bio || '소개 없음'}</p>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm">전문 분야</Label>
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {SPECIALTY_OPTIONS.map((specialty) => (
                        <div key={specialty} className="flex items-center space-x-2">
                          <Checkbox
                            id={specialty}
                            checked={selectedSpecialties.includes(specialty)}
                            onCheckedChange={() => toggleSpecialty(specialty)}
                            className="h-5 w-5"
                          />
                          <label
                            htmlFor={specialty}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {specialty}
                          </label>
                        </div>
                      ))}
                    </div>

                    {/* 기타 전문분야 입력 */}
                    <div className="space-y-2 pt-2 border-t">
                      <Label htmlFor="other_specialty" className="text-sm text-muted-foreground">
                        위 목록에 없는 전문분야 (선택사항)
                      </Label>
                      <Input
                        id="other_specialty"
                        value={otherSpecialty}
                        onChange={(e) => setOtherSpecialty(e.target.value)}
                        placeholder="예: 수중운동, 실내사이클 등"
                        className="h-12 md:h-11 text-base"
                      />
                      <p className="text-xs text-muted-foreground">
                        💡 입력하시면 관리자가 검토 후 정식 카테고리로 추가합니다
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {trainer?.specialties && trainer.specialties.length > 0 ? (
                      trainer.specialties.map((specialty: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs md:text-sm">
                          {specialty}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">전문 분야 없음</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="certifications" className="text-sm">자격증</Label>
                {isEditing ? (
                  <>
                    <Input
                      id="certifications"
                      value={certificationsInput}
                      onChange={(e) => setCertificationsInput(e.target.value)}
                      placeholder="예: 생활스포츠지도사, 노인스포츠지도사 (쉼표로 구분)"
                      className="h-12 md:h-11 text-base"
                    />
                    <p className="text-xs text-muted-foreground">쉼표(,)로 구분하여 입력하세요</p>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {trainer?.certifications && trainer.certifications.length > 0 ? (
                      trainer.certifications.map((cert: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs md:text-sm">
                          {cert}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">자격증 없음</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 서비스 정보 */}
          <Card className="md:col-span-3 bg-muted/30">
            <CardHeader className="px-4 md:px-6 pt-4 md:pt-6">
              <CardTitle className="text-base md:text-lg">서비스 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6 pb-4 md:pb-6">
              <div className="space-y-2">
                <Label htmlFor="service_areas" className="text-sm">방문 서비스 가능 지역</Label>
                {isEditing ? (
                  <>
                    <Input
                      id="service_areas"
                      value={serviceAreasInput}
                      onChange={(e) => setServiceAreasInput(e.target.value)}
                      placeholder="예: 강남구, 서초구, 송파구 (쉼표로 구분)"
                      className="h-12 md:h-11 text-base"
                    />
                    <p className="text-xs text-muted-foreground">방문 서비스가 가능한 지역을 쉼표(,)로 구분하여 입력하세요</p>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {trainer?.service_areas && trainer.service_areas.length > 0 ? (
                      trainer.service_areas.map((area: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs md:text-sm">
                          {area}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">방문 서비스 지역 미설정</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t">
                <Label className="text-sm">제공 가능한 서비스</Label>
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="home_visit"
                        checked={homeVisitAvailable}
                        onCheckedChange={(checked) => setHomeVisitAvailable(checked as boolean)}
                      />
                      <Label
                        htmlFor="home_visit"
                        className="text-sm font-normal cursor-pointer"
                      >
                        방문 서비스 (고객의 집/시설 방문)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="center_visit"
                        checked={centerVisitAvailable}
                        onCheckedChange={(checked) => setCenterVisitAvailable(checked as boolean)}
                      />
                      <Label
                        htmlFor="center_visit"
                        className="text-sm font-normal cursor-pointer"
                      >
                        센터 방문 (트레이너의 센터에서 진행)
                      </Label>
                    </div>
                    {!homeVisitAvailable && !centerVisitAvailable && (
                      <p className="text-xs text-destructive">최소 1개 이상 선택해주세요</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {homeVisitAvailable && (
                      <Badge variant="secondary" className="text-xs md:text-sm">
                        방문 서비스
                      </Badge>
                    )}
                    {centerVisitAvailable && (
                      <Badge variant="secondary" className="text-xs md:text-sm">
                        센터 방문
                      </Badge>
                    )}
                    {!homeVisitAvailable && !centerVisitAvailable && (
                      <p className="text-sm text-muted-foreground">서비스 없음</p>
                    )}
                  </div>
                )}
              </div>

              {/* 센터 정보 - 센터 방문 체크 시에만 표시 */}
              {centerVisitAvailable && (
                <>
                  <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="center_name" className="text-sm">
                      센터 이름 <span className="text-red-500">*</span>
                    </Label>
                    {isEditing ? (
                      <Input
                        id="center_name"
                        value={centerName}
                        onChange={(e) => setCenterName(e.target.value)}
                        placeholder="센터 이름을 입력하세요"
                        className="h-12 md:h-11 text-base"
                        required
                      />
                    ) : (
                      <p className="font-medium text-sm md:text-base">{centerName || '센터 정보 없음'}</p>
                    )}
                    {isEditing && (
                      <p className="text-xs text-muted-foreground">센터 방문 서비스를 제공하려면 센터 이름이 필요합니다</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="center_address" className="text-sm">센터 주소 (선택)</Label>
                    {isEditing ? (
                      <Input
                        id="center_address"
                        value={centerAddress}
                        onChange={(e) => setCenterAddress(e.target.value)}
                        placeholder="센터 주소를 입력하세요"
                        className="h-12 md:h-11 text-base"
                      />
                    ) : (
                      <p className="font-medium text-sm md:text-base">{centerAddress || '센터 주소 없음'}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="center_phone" className="text-sm">센터 연락처 (선택)</Label>
                    {isEditing ? (
                      <Input
                        id="center_phone"
                        type="tel"
                        value={centerPhone}
                        onChange={(e) => setCenterPhone(e.target.value)}
                        placeholder="010-0000-0000"
                        className="h-12 md:h-11 text-base"
                      />
                    ) : (
                      <p className="font-medium text-sm md:text-base">{centerPhone || '센터 연락처 없음'}</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </form>
    </>
  )
}
