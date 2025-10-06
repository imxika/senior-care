'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { updateCustomerProfile } from '@/app/(dashboard)/customer/settings/actions'

interface CustomerProfileFormProps {
  profile: {
    full_name?: string
    phone?: string
  }
  customer: {
    age?: number
    birth_date?: string
    gender?: string
    address?: string
    address_detail?: string
    guardian_name?: string
    guardian_relationship?: string
    guardian_phone?: string
    mobility_level?: string
    notes?: string
  }
}

export function CustomerProfileForm({ profile, customer }: CustomerProfileFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [birthDate, setBirthDate] = useState(customer?.birth_date || '')
  const [gender, setGender] = useState(customer?.gender || '')
  const [address, setAddress] = useState(customer?.address || '')
  const [addressDetail, setAddressDetail] = useState(customer?.address_detail || '')
  const [guardianName, setGuardianName] = useState(customer?.guardian_name || '')
  const [guardianRelationship, setGuardianRelationship] = useState(customer?.guardian_relationship || '')
  const [guardianPhone, setGuardianPhone] = useState(customer?.guardian_phone || '')
  const [mobilityLevel, setMobilityLevel] = useState(customer?.mobility_level || '')
  const [notes, setNotes] = useState(customer?.notes || '')

  // Collapsible state - open if guardian data exists
  const [isGuardianOpen, setIsGuardianOpen] = useState(
    !!(customer?.guardian_name || customer?.guardian_relationship || customer?.guardian_phone)
  )

  // Calculate age from birth_date
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return ''
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age.toString()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData()
    formData.set('full_name', fullName)
    formData.set('phone', phone)
    formData.set('birth_date', birthDate)
    formData.set('gender', gender)
    formData.set('address', address)
    formData.set('address_detail', addressDetail)
    formData.set('guardian_name', guardianName)
    formData.set('guardian_relationship', guardianRelationship)
    formData.set('guardian_phone', guardianPhone)
    formData.set('mobility_level', mobilityLevel)
    formData.set('notes', notes)

    const result = await updateCustomerProfile(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  const handleCancel = () => {
    setFullName(profile?.full_name || '')
    setPhone(profile?.phone || '')
    setBirthDate(customer?.birth_date || '')
    setGender(customer?.gender || '')
    setAddress(customer?.address || '')
    setAddressDetail(customer?.address_detail || '')
    setGuardianName(customer?.guardian_name || '')
    setGuardianRelationship(customer?.guardian_relationship || '')
    setGuardianPhone(customer?.guardian_phone || '')
    setMobilityLevel(customer?.mobility_level || '')
    setNotes(customer?.notes || '')
    setError(null)
    setSuccess(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 기본 정보 */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">이름 *</Label>
          <Input
            id="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">연락처</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-1234-5678"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="birth_date">
            생년월일 <span className="text-xs text-muted-foreground">(예: 1964년 1월 1일)</span>
          </Label>
          <Input
            id="birth_date"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
          {birthDate && (
            <p className="text-xs text-muted-foreground">
              만 {calculateAge(birthDate)}세
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">성별</Label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger>
              <SelectValue placeholder="선택하세요" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">남성</SelectItem>
              <SelectItem value="female">여성</SelectItem>
              <SelectItem value="other">기타</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 주소 */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="address">주소</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="서울시 강남구 테헤란로"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address_detail">상세주소</Label>
          <Input
            id="address_detail"
            value={addressDetail}
            onChange={(e) => setAddressDetail(e.target.value)}
            placeholder="101동 1001호"
          />
        </div>
      </div>

      {/* 보호자 정보 (선택사항 - Collapsible) */}
      <Collapsible open={isGuardianOpen} onOpenChange={setIsGuardianOpen}>
        <div className="border rounded-lg p-4 bg-muted/50">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="w-full flex items-center justify-between hover:bg-transparent p-0 h-auto mb-4"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">보호자 정보</span>
                <span className="text-xs text-muted-foreground">(선택사항)</span>
              </div>
              {isGuardianOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="guardian_name">보호자 이름</Label>
                <Input
                  id="guardian_name"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="홍길동"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guardian_relationship">관계</Label>
                <Select value={guardianRelationship} onValueChange={setGuardianRelationship}>
                  <SelectTrigger>
                    <SelectValue placeholder="선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="자녀">자녀</SelectItem>
                    <SelectItem value="배우자">배우자</SelectItem>
                    <SelectItem value="친척">친척</SelectItem>
                    <SelectItem value="친구">친구</SelectItem>
                    <SelectItem value="기타">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guardian_phone">보호자 연락처</Label>
                <Input
                  id="guardian_phone"
                  type="tel"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="010-1234-5678"
                />
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* 거동 능력 */}
      <div className="space-y-2">
        <Label htmlFor="mobility_level">거동 능력</Label>
        <Select value={mobilityLevel} onValueChange={setMobilityLevel}>
          <SelectTrigger>
            <SelectValue placeholder="선택하세요" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="independent">독립적</SelectItem>
            <SelectItem value="assisted">보조 필요</SelectItem>
            <SelectItem value="wheelchair">휠체어 사용</SelectItem>
            <SelectItem value="bedridden">와상 상태</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 메모 */}
      <div className="space-y-2">
        <Label htmlFor="notes">기타 메모</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="건강 상태, 특이사항 등을 자유롭게 작성하세요"
          rows={4}
        />
      </div>

      {/* 에러/성공 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>프로필이 성공적으로 업데이트되었습니다.</AlertDescription>
        </Alert>
      )}

      {/* 제출 버튼 */}
      <div className="flex gap-2 w-full md:w-auto">
        <Button type="button" variant="outline" onClick={handleCancel} disabled={loading} className="flex-1 md:flex-none">
          초기화
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 md:flex-none">
          {loading ? '저장 중...' : '저장하기'}
        </Button>
      </div>
    </form>
  )
}
