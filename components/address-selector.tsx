"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { MapPin, Plus, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Address {
  id: string
  address: string
  address_detail?: string
  address_label?: string
  is_default: boolean
}

interface AddressSelectorProps {
  customerId: string
  serviceType: string
  onAddressChange?: (addressId: string | null, fullAddress: string) => void
}

export function AddressSelector({ customerId, serviceType, onAddressChange }: AddressSelectorProps) {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedMode, setSelectedMode] = useState<'existing' | 'new'>('existing')
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [newAddress, setNewAddress] = useState('')
  const [newAddressDetail, setNewAddressDetail] = useState('')
  const [newAddressLabel, setNewAddressLabel] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // 주소 목록 불러오기
  useEffect(() => {
    const fetchAddresses = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      console.log('[AddressSelector] Fetched addresses:', { customerId, data, error })

      if (!error && data) {
        setAddresses(data)
        // 기본 주소가 있으면 자동 선택
        const defaultAddr = data.find(addr => addr.is_default)
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id)
          setSelectedMode('existing')
          onAddressChange?.(defaultAddr.id, `${defaultAddr.address} ${defaultAddr.address_detail || ''}`.trim())
        } else if (data.length === 0) {
          // 주소가 없으면 새 주소 입력 모드로
          setSelectedMode('new')
        }
      } else if (error) {
        console.error('[AddressSelector] Error fetching addresses:', error)
        // 에러 시에도 새 주소 입력 가능하도록
        setSelectedMode('new')
      }
      setIsLoading(false)
    }

    if (customerId) {
      fetchAddresses()
    }
  }, [customerId, onAddressChange])

  // 선택 변경 시 부모에게 알림
  const handleAddressSelect = (addressId: string) => {
    setSelectedAddressId(addressId)
    const addr = addresses.find(a => a.id === addressId)
    if (addr) {
      onAddressChange?.(addressId, `${addr.address} ${addr.address_detail || ''}`.trim())
    }
  }

  const handleNewAddressChange = () => {
    if (newAddress.trim()) {
      onAddressChange?.(null, `${newAddress} ${newAddressDetail}`.trim())
    }
  }

  // 방문 서비스가 아니면 표시하지 않음
  if (serviceType !== 'home' && serviceType !== 'home_visit') {
    return null
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">주소 정보를 불러오는 중...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5" />
          방문 주소 선택
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedMode}
          onValueChange={(value) => setSelectedMode(value as 'existing' | 'new')}
        >
          {/* 기존 주소 사용 */}
          {addresses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing" className="font-medium">
                  저장된 주소 사용
                </Label>
              </div>

              {selectedMode === 'existing' && (
                <div className="ml-6 space-y-2">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedAddressId === addr.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleAddressSelect(addr.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {addr.address_label && (
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-primary">
                                {addr.address_label}
                              </span>
                              {addr.is_default && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                  기본
                                </span>
                              )}
                            </div>
                          )}
                          <p className="text-sm font-medium">{addr.address}</p>
                          {addr.address_detail && (
                            <p className="text-sm text-muted-foreground">{addr.address_detail}</p>
                          )}
                        </div>
                        {selectedAddressId === addr.id && (
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 새 주소 입력 */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new" className="font-medium">
                새 주소 입력
              </Label>
            </div>

            {selectedMode === 'new' && (
              <div className="ml-6 space-y-3">
                <div>
                  <Label htmlFor="new-address-label" className="text-sm">
                    주소 별칭 (선택사항)
                  </Label>
                  <Input
                    id="new-address-label"
                    name="new_address_label"
                    placeholder="예: 집, 부모님 집"
                    value={newAddressLabel}
                    onChange={(e) => setNewAddressLabel(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="new-address" className="text-sm">
                    주소 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="new-address"
                    name="new_address"
                    placeholder="서울시 강남구 테헤란로 123"
                    value={newAddress}
                    onChange={(e) => {
                      setNewAddress(e.target.value)
                      handleNewAddressChange()
                    }}
                    required={selectedMode === 'new'}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="new-address-detail" className="text-sm">
                    상세 주소
                  </Label>
                  <Input
                    id="new-address-detail"
                    name="new_address_detail"
                    placeholder="101동 1001호"
                    value={newAddressDetail}
                    onChange={(e) => {
                      setNewAddressDetail(e.target.value)
                      handleNewAddressChange()
                    }}
                    className="mt-1"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  💡 입력한 주소는 자동으로 저장되어 다음번에도 사용할 수 있습니다.
                </p>
              </div>
            )}
          </div>
        </RadioGroup>

        {/* Hidden fields for form submission */}
        <input type="hidden" name="address_mode" value={selectedMode} />
        {selectedMode === 'existing' ? (
          <input type="hidden" name="address_id" value={selectedAddressId} />
        ) : null}
      </CardContent>
    </Card>
  )
}
