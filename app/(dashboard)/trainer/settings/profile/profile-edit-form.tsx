'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, X } from 'lucide-react'
import { updateTrainerProfile } from './actions'

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
  const [specialtiesInput, setSpecialtiesInput] = useState(
    trainer?.specialties?.join(', ') || ''
  )
  const [certificationsInput, setCertificationsInput] = useState(
    trainer?.certifications?.join(', ') || ''
  )
  const [serviceAreasInput, setServiceAreasInput] = useState(
    trainer?.service_areas?.join(', ') || ''
  )
  const [maxGroupSize, setMaxGroupSize] = useState(trainer?.max_group_size?.toString() || '')
  const [centerName, setCenterName] = useState(trainer?.center_name || '')
  const [centerAddress, setCenterAddress] = useState(trainer?.center_address || '')

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

    const formData = new FormData()
    formData.append('full_name', fullName)
    formData.append('phone', phone)
    formData.append('years_experience', yearsExperience || '0')
    formData.append('hourly_rate', hourlyRate || '0')
    formData.append('bio', bio)
    formData.append('specialties', specialtiesInput)
    formData.append('certifications', certificationsInput)
    formData.append('service_areas', serviceAreasInput)
    formData.append('max_group_size', maxGroupSize || '1')
    formData.append('center_name', centerName)
    formData.append('center_address', centerAddress)

    const result = await updateTrainerProfile(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setLoading(false)
      setIsEditing(false)
      router.refresh()
    }
  }

  const handleCancel = () => {
    // 원래 값으로 되돌리기
    setFullName(profile?.full_name || '')
    setPhone(profile?.phone || '')
    setYearsExperience(trainer?.years_experience?.toString() || '')
    setHourlyRate(trainer?.hourly_rate?.toString() || '')
    setBio(trainer?.bio || '')
    setSpecialtiesInput(trainer?.specialties?.join(', ') || '')
    setCertificationsInput(trainer?.certifications?.join(', ') || '')
    setServiceAreasInput(trainer?.service_areas?.join(', ') || '')
    setMaxGroupSize(trainer?.max_group_size?.toString() || '')
    setCenterName(trainer?.center_name || '')
    setCenterAddress(trainer?.center_address || '')
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
                <Label htmlFor="specialties" className="text-sm">전문 분야</Label>
                {isEditing ? (
                  <>
                    <Input
                      id="specialties"
                      value={specialtiesInput}
                      onChange={(e) => setSpecialtiesInput(e.target.value)}
                      placeholder="예: 근력 운동, 유산소, 재활 (쉼표로 구분)"
                      className="h-12 md:h-11 text-base"
                    />
                    <p className="text-xs text-muted-foreground">쉼표(,)로 구분하여 입력하세요</p>
                  </>
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
                <Label htmlFor="service_areas" className="text-sm">서비스 지역</Label>
                {isEditing ? (
                  <>
                    <Input
                      id="service_areas"
                      value={serviceAreasInput}
                      onChange={(e) => setServiceAreasInput(e.target.value)}
                      placeholder="예: 강남구, 서초구, 송파구 (쉼표로 구분)"
                      className="h-12 md:h-11 text-base"
                    />
                    <p className="text-xs text-muted-foreground">쉼표(,)로 구분하여 입력하세요</p>
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
                      <p className="text-sm text-muted-foreground">서비스 지역 없음</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="center_name" className="text-sm">센터 이름 (선택)</Label>
                {isEditing ? (
                  <Input
                    id="center_name"
                    value={centerName}
                    onChange={(e) => setCenterName(e.target.value)}
                    placeholder="센터 이름을 입력하세요"
                    className="h-12 md:h-11 text-base"
                  />
                ) : (
                  <p className="font-medium text-sm md:text-base">{centerName || '센터 정보 없음'}</p>
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
            </CardContent>
          </Card>
        </div>
      </form>
    </>
  )
}
