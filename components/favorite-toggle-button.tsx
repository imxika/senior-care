'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface FavoriteToggleButtonProps {
  trainerId: string
  customerId: string | null
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showText?: boolean
  className?: string
}

export function FavoriteToggleButton({
  trainerId,
  customerId,
  variant = 'outline',
  size = 'default',
  showText = true,
  className,
}: FavoriteToggleButtonProps) {
  const router = useRouter()
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteId, setFavoriteId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (customerId && mounted) {
      checkFavoriteStatus()
    }
  }, [trainerId, customerId, mounted])

  const checkFavoriteStatus = async () => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('customer_id', customerId)
      .eq('trainer_id', trainerId)
      .maybeSingle()

    if (!error && data) {
      setIsFavorited(true)
      setFavoriteId(data.id)
    } else {
      setIsFavorited(false)
      setFavoriteId(null)
    }

    setIsChecking(false)
  }

  const handleToggle = async () => {
    setIsLoading(true)
    const supabase = createClient()

    if (isFavorited && favoriteId) {
      // 즐겨찾기 해제
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId)

      if (error) {
        console.error('Error removing favorite:', error)
        toast.error('즐겨찾기 해제 실패')
        setIsLoading(false)
        return
      }

      setIsFavorited(false)
      setFavoriteId(null)
      toast.success('즐겨찾기 해제 완료')
    } else {
      // 즐겨찾기 추가
      const { data, error } = await supabase
        .from('favorites')
        .insert({
          customer_id: customerId,
          trainer_id: trainerId,
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error adding favorite:', error)
        toast.error('즐겨찾기 추가 실패')
        setIsLoading(false)
        return
      }

      setIsFavorited(true)
      setFavoriteId(data.id)
      toast.success('즐겨찾기에 추가되었습니다')
    }

    setIsLoading(false)
    router.refresh()
  }

  // 고객이 아니면 버튼 표시 안함
  if (!customerId) {
    return null
  }

  // 클라이언트에서 마운트될 때까지 서버 렌더링과 동일한 내용 표시
  if (!mounted || isChecking) {
    return (
      <Button variant={variant} size={size} disabled className={className}>
        <Heart className="h-4 w-4" />
        {showText && <span className="ml-2">즐겨찾기</span>}
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      disabled={isLoading}
      className={`${isFavorited ? 'text-red-500 hover:text-red-600' : ''} ${className || ''}`}
    >
      <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
      {showText && (
        <span className="ml-2">
          {isFavorited ? '즐겨찾기 해제' : '즐겨찾기'}
        </span>
      )}
    </Button>
  )
}
