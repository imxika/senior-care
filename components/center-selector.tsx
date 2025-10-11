'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Building2, MapPin, FileText, Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface Center {
  id: string
  name: string
  address: string | null
  business_registration_number: string | null
}

interface CenterSelectorProps {
  selectedCenterId: string | null
  onCenterSelect: (centerId: string | null) => void
  disabled?: boolean
}

export function CenterSelector({
  selectedCenterId,
  onCenterSelect,
  disabled = false,
}: CenterSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [centers, setCenters] = useState<Center[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null)

  // 센터 검색
  const searchCenters = useCallback(async (query: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/centers/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (response.ok) {
        setCenters(data.centers || [])
      } else {
        console.error('센터 검색 실패:', data.error)
        setCenters([])
      }
    } catch (error) {
      console.error('센터 검색 오류:', error)
      setCenters([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 검색어 변경 시 검색 (최소 1글자 이상)
  useEffect(() => {
    if (searchQuery.trim().length >= 1) {
      searchCenters(searchQuery)
    } else {
      // 검색어가 없으면 목록 비우기
      setCenters([])
    }
  }, [searchQuery, searchCenters])

  // 선택된 센터 ID로 센터 정보 가져오기
  useEffect(() => {
    if (selectedCenterId) {
      const center = centers.find((c) => c.id === selectedCenterId)
      if (center) {
        setSelectedCenter(center)
      } else {
        // 센터 목록에 없으면 API로 가져오기
        fetch(`/api/centers/search?q=${selectedCenterId}`)
          .then((res) => res.json())
          .then((data) => {
            const foundCenter = data.centers?.find((c: Center) => c.id === selectedCenterId)
            if (foundCenter) {
              setSelectedCenter(foundCenter)
            }
          })
          .catch(console.error)
      }
    } else {
      setSelectedCenter(null)
    }
  }, [selectedCenterId, centers])

  const handleSelect = (center: Center | null) => {
    setSelectedCenter(center)
    onCenterSelect(center?.id || null)
    setOpen(false)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="center-selector" className="text-sm">
        센터 선택 (선택사항)
      </Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="center-selector"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-12 md:h-11 text-base"
            disabled={disabled}
          >
            {selectedCenter ? (
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate">{selectedCenter.name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">센터를 검색하세요...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                placeholder="센터명, ID, 사업자번호로 검색..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="flex h-11 w-full"
              />
            </div>

            <CommandList>
              {centers.length === 0 && !isLoading && searchQuery.trim().length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  검색어를 입력하세요
                </div>
              ) : centers.length === 0 && !isLoading ? (
                <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
              ) : isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  검색 중...
                </div>
              ) : null}

              {centers.length > 0 && (
                <CommandGroup>
                {/* 선택 해제 옵션 */}
                {selectedCenter && (
                  <CommandItem
                    value="none"
                    onSelect={() => handleSelect(null)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex h-4 w-4 items-center justify-center">
                        {!selectedCenterId && <Check className="h-4 w-4" />}
                      </div>
                      <span className="text-muted-foreground">센터 선택 안 함</span>
                    </div>
                  </CommandItem>
                )}

                {centers.map((center) => (
                  <CommandItem
                    key={center.id}
                    value={center.id}
                    onSelect={() => handleSelect(center)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start gap-2 w-full">
                      <div className="flex h-4 w-4 items-center justify-center mt-0.5">
                        {selectedCenterId === center.id && <Check className="h-4 w-4" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <p className="font-medium truncate">{center.name}</p>
                        </div>

                        {center.address && (
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground truncate">
                              {center.address}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-1">
                          <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <p className="text-xs font-mono text-muted-foreground">
                            #{center.id.substring(0, 6).toUpperCase()}
                            {center.business_registration_number &&
                              ` • ${center.business_registration_number}`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedCenter && (
        <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/50 rounded-md">
          <p className="font-medium">선택된 센터:</p>
          <p className="flex items-center gap-1.5">
            <Building2 className="h-3 w-3" />
            {selectedCenter.name}
          </p>
          {selectedCenter.address && (
            <p className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              {selectedCenter.address}
            </p>
          )}
          <p className="flex items-center gap-1.5">
            <FileText className="h-3 w-3" />
            #{selectedCenter.id.substring(0, 6).toUpperCase()}
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        💡 승인된 센터만 선택 가능합니다. 센터가 없다면 먼저 센터를 등록하세요.
      </p>
    </div>
  )
}
