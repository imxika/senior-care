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
import { updateCustomerProfile } from '@/app/(dashboard)/customer/settings/actions'

interface CustomerProfileFormProps {
  profile: any
  customer: any
}

export function CustomerProfileForm({ profile, customer }: CustomerProfileFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [age, setAge] = useState(customer?.age?.toString() || '')
  const [gender, setGender] = useState(customer?.gender || '')
  const [address, setAddress] = useState(customer?.address || '')
  const [addressDetail, setAddressDetail] = useState(customer?.address_detail || '')
  const [emergencyContact, setEmergencyContact] = useState(customer?.emergency_contact || '')
  const [emergencyPhone, setEmergencyPhone] = useState(customer?.emergency_phone || '')
  const [mobilityLevel, setMobilityLevel] = useState(customer?.mobility_level || '')
  const [notes, setNotes] = useState(customer?.notes || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData()
    formData.set('full_name', fullName)
    formData.set('phone', phone)
    formData.set('age', age)
    formData.set('gender', gender)
    formData.set('address', address)
    formData.set('address_detail', addressDetail)
    formData.set('emergency_contact', emergencyContact)
    formData.set('emergency_phone', emergencyPhone)
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
          <Label htmlFor="age">나이</Label>
          <Input
            id="age"
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="65"
          />
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

      {/* 비상연락망 */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="emergency_contact">비상연락처 이름</Label>
          <Input
            id="emergency_contact"
            value={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.value)}
            placeholder="김보호자"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="emergency_phone">비상연락처 전화번호</Label>
          <Input
            id="emergency_phone"
            type="tel"
            value={emergencyPhone}
            onChange={(e) => setEmergencyPhone(e.target.value)}
            placeholder="010-9876-5432"
          />
        </div>
      </div>

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
      <Button type="submit" disabled={loading} className="w-full md:w-auto">
        {loading ? '저장 중...' : '저장하기'}
      </Button>
    </form>
  )
}
