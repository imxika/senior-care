'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Building2, MapPin, Phone, FileText, Loader2, Plus, Edit, Trash2 } from 'lucide-react'
import { createOrUpdateCenter, deleteCenter } from './actions'

interface Center {
  id: string
  name: string
  address: string
  phone?: string | null
  business_registration_number?: string | null
  description?: string | null
  is_verified: boolean
  is_active: boolean
  created_at: string
}

interface CenterFormProps {
  trainerId?: string
  ownedCenters: Center[]
}

export function CenterForm({ trainerId, ownedCenters }: CenterFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editingCenterId, setEditingCenterId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    business_registration_number: '',
    description: '',
  })

  const canAddMore = ownedCenters.length < 3

  const handleEdit = (center: Center) => {
    setEditingCenterId(center.id)
    setFormData({
      name: center.name,
      address: center.address,
      phone: center.phone || '',
      business_registration_number: center.business_registration_number || '',
      description: center.description || '',
    })
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setEditingCenterId(null)
    setFormData({
      name: '',
      address: '',
      phone: '',
      business_registration_number: '',
      description: '',
    })
    setIsEditing(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!trainerId) {
      toast.error('트레이너 정보를 찾을 수 없습니다')
      return
    }

    // 필수 입력 검증
    if (!formData.name.trim()) {
      toast.error('센터명을 입력해주세요')
      return
    }

    if (!formData.address.trim()) {
      toast.error('센터 주소를 입력해주세요')
      return
    }

    setIsLoading(true)

    try {
      const result = await createOrUpdateCenter({
        trainerId,
        centerId: editingCenterId || undefined,
        centerData: {
          name: formData.name.trim(),
          address: formData.address.trim(),
          phone: formData.phone.trim() || null,
          business_registration_number: formData.business_registration_number.trim() || null,
          description: formData.description.trim() || null,
        }
      })

      if (result.error) {
        toast.error('센터 정보 저장 실패', {
          description: result.error,
        })
        return
      }

      toast.success(editingCenterId ? '센터 정보가 수정되었습니다' : '센터가 등록되었습니다', {
        description: '관리자 승인 후 센터 방문 서비스를 제공할 수 있습니다.',
      })

      handleCancelEdit()
      router.refresh()
    } catch (error) {
      console.error('센터 저장 오류:', error)
      toast.error('오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (centerId: string) => {
    if (!confirm('센터 정보를 삭제하시겠습니까? 센터 방문 예약을 더 이상 받을 수 없습니다.')) {
      return
    }

    setIsDeleting(centerId)

    try {
      const result = await deleteCenter(centerId)

      if (result.error) {
        toast.error('센터 삭제 실패', {
          description: result.error,
        })
        return
      }

      toast.success('센터 정보가 삭제되었습니다')
      router.refresh()
    } catch (error) {
      console.error('센터 삭제 오류:', error)
      toast.error('오류가 발생했습니다')
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 등록된 센터 목록 */}
      {ownedCenters.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">등록된 센터 ({ownedCenters.length}/3)</h2>
            {canAddMore && !isEditing && (
              <Button
                type="button"
                onClick={() => setIsEditing(true)}
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                새 센터 추가
              </Button>
            )}
          </div>

          <div className="grid gap-4">
            {ownedCenters.map((center) => (
              <Card key={center.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {center.name}
                        <span className="text-xs font-mono text-muted-foreground font-normal">
                          #{center.id.substring(0, 6).toUpperCase()}
                        </span>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {center.address}
                          </span>
                          {center.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {center.phone}
                            </span>
                          )}
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        center.is_verified ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {center.is_verified ? '✓ 인증완료' : '⏳ 승인대기'}
                      </span>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        center.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {center.is_active ? '✅ 운영중' : '⏸️ 중지'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 pb-3 border-b">
                    <p className="text-xs text-muted-foreground">
                      센터 ID: <span className="font-mono">{center.id}</span>
                    </p>
                    {center.business_registration_number && (
                      <p className="text-xs text-muted-foreground mt-1">
                        사업자등록번호: {center.business_registration_number}
                      </p>
                    )}
                    {center.description && (
                      <p className="text-sm mt-2">{center.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 justify-end">
                    {!center.is_verified && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(center)}
                          disabled={isLoading || isDeleting !== null || isEditing}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          수정
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(center.id)}
                          disabled={isLoading || isDeleting !== null || isEditing}
                        >
                          {isDeleting === center.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              삭제 중...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-1" />
                              삭제
                            </>
                          )}
                        </Button>
                      </>
                    )}
                    {center.is_verified && (
                      <p className="text-xs text-muted-foreground">
                        ✓ 승인된 센터는 수정/삭제할 수 없습니다
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 센터 추가/수정 폼 */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {editingCenterId ? '센터 정보 수정' : '새 센터 등록'}
              </CardTitle>
              <CardDescription>
                센터 방문 서비스를 제공하는 경우 센터 정보를 입력해주세요.
                {ownedCenters.length === 0 && ' (최대 3개까지 등록 가능)'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  센터명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="예: 강남 시니어케어 센터"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  센터 주소 <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="address"
                  placeholder="예: 서울시 강남구 테헤란로 123, 2층"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  센터 전화번호
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="예: 02-1234-5678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  고객이 센터로 직접 연락할 수 있는 번호입니다.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_registration_number" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  사업자등록번호
                </Label>
                <Input
                  id="business_registration_number"
                  placeholder="예: 123-45-67890"
                  value={formData.business_registration_number}
                  onChange={(e) => setFormData({ ...formData, business_registration_number: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  센터 인증을 위해 필요합니다. (선택사항)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">센터 소개</Label>
                <Textarea
                  id="description"
                  placeholder="센터의 특징, 시설 안내 등을 입력해주세요."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* 액션 버튼 */}
          <div className="flex gap-3 justify-end">
            {(editingCenterId || ownedCenters.length > 0) && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isLoading}
              >
                취소
              </Button>
            )}
            <Button type="submit" disabled={isLoading || isDeleting !== null}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : editingCenterId ? (
                '수정 저장'
              ) : (
                '센터 등록'
              )}
            </Button>
          </div>
        </form>
      )}

      {/* 센터가 없을 때 안내 메시지 */}
      {ownedCenters.length === 0 && !isEditing && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">등록된 센터가 없습니다</p>
            <p className="text-sm text-muted-foreground mb-4">
              센터 방문 서비스를 제공하려면 센터를 등록해주세요.
            </p>
            <Button onClick={() => setIsEditing(true)}>
              <Plus className="w-4 h-4 mr-2" />
              첫 센터 등록하기
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
