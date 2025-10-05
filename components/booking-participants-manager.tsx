'use client'

import { useState } from 'react'
import { Plus, X, UserPlus, Mail, Phone, Calendar, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface Participant {
  id: string
  customer_id?: string
  customer_name?: string
  customer_email?: string
  guest_name?: string
  guest_phone?: string
  guest_email?: string
  guest_birth_date?: string
  guest_gender?: string
  payment_amount: number
  payment_status: 'pending' | 'paid' | 'refunded' | 'cancelled'
  is_primary: boolean
}

interface BookingParticipantsManagerProps {
  bookingId?: string
  sessionType: '1:1' | '2:1' | '3:1' | 'group'
  maxParticipants: number
  totalPrice: number
  participants: Participant[]
  onParticipantsChange: (participants: Participant[]) => void
  readOnly?: boolean
}

export function BookingParticipantsManager({
  bookingId,
  sessionType,
  maxParticipants,
  totalPrice,
  participants,
  onParticipantsChange,
  readOnly = false,
}: BookingParticipantsManagerProps) {
  const [searchEmail, setSearchEmail] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // 참가자 추가 (회원 검색)
  const handleSearchMember = async () => {
    if (!searchEmail) {
      toast.error('이메일을 입력하세요')
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/customers/search?email=${encodeURIComponent(searchEmail)}`)
      const data = await response.json()

      if (data.customer) {
        // 이미 추가된 회원인지 확인
        const exists = participants.some(p => p.customer_id === data.customer.id)
        if (exists) {
          toast.error('이미 추가된 회원입니다')
          return
        }

        // 참가자 추가
        const newParticipant: Participant = {
          id: `temp-${Date.now()}`,
          customer_id: data.customer.id,
          customer_name: data.customer.full_name,
          customer_email: data.customer.email,
          payment_amount: Math.round(totalPrice / (participants.length + 1)),
          payment_status: 'pending',
          is_primary: false,
        }

        // 기존 참가자들의 금액도 재분배
        const updatedParticipants = [...participants, newParticipant].map((p, idx, arr) => ({
          ...p,
          payment_amount: Math.round(totalPrice / arr.length),
        }))

        onParticipantsChange(updatedParticipants)
        setSearchEmail('')
        toast.success('회원을 추가했습니다')
      } else {
        toast.error('회원을 찾을 수 없습니다')
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('회원 검색 중 오류가 발생했습니다')
    } finally {
      setIsSearching(false)
    }
  }

  // 참가자 추가 (비회원)
  const handleAddGuest = () => {
    if (participants.length >= maxParticipants) {
      toast.error(`최대 ${maxParticipants}명까지만 추가할 수 있습니다`)
      return
    }

    const newParticipant: Participant = {
      id: `temp-${Date.now()}`,
      guest_name: '',
      guest_phone: '',
      guest_email: '',
      payment_amount: Math.round(totalPrice / (participants.length + 1)),
      payment_status: 'pending',
      is_primary: false,
    }

    // 기존 참가자들의 금액도 재분배
    const updatedParticipants = [...participants, newParticipant].map((p, idx, arr) => ({
      ...p,
      payment_amount: Math.round(totalPrice / arr.length),
    }))

    onParticipantsChange(updatedParticipants)
  }

  // 참가자 제거
  const handleRemoveParticipant = (id: string) => {
    const participant = participants.find(p => p.id === id)
    if (participant?.is_primary) {
      toast.error('예약 주최자는 제거할 수 없습니다')
      return
    }

    const updatedParticipants = participants
      .filter(p => p.id !== id)
      .map((p, idx, arr) => ({
        ...p,
        payment_amount: Math.round(totalPrice / arr.length),
      }))

    onParticipantsChange(updatedParticipants)
    toast.success('참가자를 제거했습니다')
  }

  // 참가자 정보 수정
  const handleUpdateParticipant = (id: string, field: string, value: any) => {
    const updatedParticipants = participants.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    )
    onParticipantsChange(updatedParticipants)
  }

  // 결제 금액 수동 조정
  const handleUpdatePaymentAmount = (id: string, amount: number) => {
    const updatedParticipants = participants.map(p =>
      p.id === id ? { ...p, payment_amount: amount } : p
    )
    onParticipantsChange(updatedParticipants)
  }

  const totalPaymentAmount = participants.reduce((sum, p) => sum + p.payment_amount, 0)
  const canAddMore = participants.length < maxParticipants

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              참가자 관리 ({participants.length}/{maxParticipants}명)
            </CardTitle>
            <CardDescription className="mt-1">
              {sessionType} 세션 참가자를 관리하세요
            </CardDescription>
          </div>
          <Badge variant={totalPaymentAmount === totalPrice ? 'default' : 'destructive'}>
            총 {totalPaymentAmount.toLocaleString()}원 / {totalPrice.toLocaleString()}원
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 회원 검색 추가 */}
        {!readOnly && canAddMore && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <h4 className="font-semibold text-sm">회원 추가</h4>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="search-email" className="sr-only">회원 이메일</Label>
                <Input
                  id="search-email"
                  type="email"
                  placeholder="회원 이메일 또는 ID 입력"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchMember()}
                />
              </div>
              <Button onClick={handleSearchMember} disabled={isSearching}>
                <Mail className="h-4 w-4 mr-2" />
                {isSearching ? '검색 중...' : '회원 검색'}
              </Button>
            </div>
            <Separator />
            <Button
              variant="outline"
              onClick={handleAddGuest}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              비회원 추가
            </Button>
          </div>
        )}

        {/* 참가자 목록 */}
        <div className="space-y-3">
          {participants.map((participant, index) => (
            <div
              key={participant.id}
              className="p-4 border rounded-lg space-y-3 relative"
            >
              {/* 주최자 배지 */}
              {participant.is_primary && (
                <Badge variant="default" className="absolute top-2 right-2">
                  예약 주최자
                </Badge>
              )}

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    {participant.customer_id ? (
                      <>
                        <p className="font-semibold">{participant.customer_name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {participant.customer_email}
                        </p>
                        <Badge variant="secondary" className="mt-1">회원</Badge>
                      </>
                    ) : (
                      <Badge variant="outline">비회원</Badge>
                    )}
                  </div>
                </div>
                {!readOnly && !participant.is_primary && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveParticipant(participant.id)}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              {/* 비회원 정보 입력 */}
              {!participant.customer_id && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`guest-name-${participant.id}`}>이름 *</Label>
                    <Input
                      id={`guest-name-${participant.id}`}
                      value={participant.guest_name || ''}
                      onChange={(e) => handleUpdateParticipant(participant.id, 'guest_name', e.target.value)}
                      placeholder="홍길동"
                      disabled={readOnly}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`guest-phone-${participant.id}`}>연락처 *</Label>
                    <Input
                      id={`guest-phone-${participant.id}`}
                      value={participant.guest_phone || ''}
                      onChange={(e) => handleUpdateParticipant(participant.id, 'guest_phone', e.target.value)}
                      placeholder="010-0000-0000"
                      disabled={readOnly}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`guest-email-${participant.id}`}>이메일</Label>
                    <Input
                      id={`guest-email-${participant.id}`}
                      type="email"
                      value={participant.guest_email || ''}
                      onChange={(e) => handleUpdateParticipant(participant.id, 'guest_email', e.target.value)}
                      placeholder="example@email.com"
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`guest-birth-${participant.id}`}>생년월일</Label>
                    <Input
                      id={`guest-birth-${participant.id}`}
                      type="date"
                      value={participant.guest_birth_date || ''}
                      onChange={(e) => handleUpdateParticipant(participant.id, 'guest_birth_date', e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor={`guest-gender-${participant.id}`}>성별</Label>
                    <Select
                      value={participant.guest_gender || ''}
                      onValueChange={(value) => handleUpdateParticipant(participant.id, 'guest_gender', value)}
                      disabled={readOnly}
                    >
                      <SelectTrigger id={`guest-gender-${participant.id}`}>
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
              )}

              {/* 결제 정보 */}
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`payment-amount-${participant.id}`}>결제 금액</Label>
                  <Input
                    id={`payment-amount-${participant.id}`}
                    type="number"
                    value={participant.payment_amount}
                    onChange={(e) => handleUpdatePaymentAmount(participant.id, parseInt(e.target.value) || 0)}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label htmlFor={`payment-status-${participant.id}`}>결제 상태</Label>
                  <Select
                    value={participant.payment_status}
                    onValueChange={(value) => handleUpdateParticipant(participant.id, 'payment_status', value)}
                    disabled={readOnly}
                  >
                    <SelectTrigger id={`payment-status-${participant.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">대기</SelectItem>
                      <SelectItem value="paid">완료</SelectItem>
                      <SelectItem value="refunded">환불</SelectItem>
                      <SelectItem value="cancelled">취소</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 금액 검증 경고 */}
        {totalPaymentAmount !== totalPrice && (
          <div className="p-3 bg-destructive/10 border border-destructive rounded-lg text-sm text-destructive">
            ⚠️ 참가자별 결제 금액 합계({totalPaymentAmount.toLocaleString()}원)가
            전체 금액({totalPrice.toLocaleString()}원)과 일치하지 않습니다.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
