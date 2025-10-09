'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface FavoriteButtonProps {
  trainerId: string
  variant?: 'default' | 'icon' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showLabel?: boolean
  className?: string
}

export function FavoriteButton({
  trainerId,
  variant = 'ghost',
  size = 'icon',
  showLabel = false,
  className = '',
}: FavoriteButtonProps) {
  const router = useRouter()
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteId, setFavoriteId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [isCustomer, setIsCustomer] = useState(false)

  useEffect(() => {
    checkFavoriteStatus()
  }, [trainerId])

  const checkFavoriteStatus = async () => {
    const supabase = createClient()

    // 1. 현재 사용자 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setIsCustomer(false)
      return
    }

    // 2. 고객인지 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'customer') {
      setIsCustomer(false)
      return
    }

    setIsCustomer(true)

    // 3. 고객 ID 조회
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!customer) return

    setCustomerId(customer.id)

    // 4. 찜 상태 확인
    const { data: favorite } = await supabase
      .from('favorites')
      .select('id')
      .eq('customer_id', customer.id)
      .eq('trainer_id', trainerId)
      .maybeSingle()

    if (favorite) {
      setIsFavorite(true)
      setFavoriteId(favorite.id)
    } else {
      setIsFavorite(false)
      setFavoriteId(null)
    }
  }

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault() // 링크 클릭 방지
    e.stopPropagation() // 이벤트 버블링 방지

    const supabase = createClient()

    // 로그인 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('로그인이 필요합니다', {
        description: '찜하기 기능을 사용하려면 로그인해주세요.',
      })
      router.push('/login')
      return
    }

    if (!isCustomer) {
      toast.error('고객 전용 기능입니다', {
        description: '고객만 트레이너를 찜할 수 있습니다.',
      })
      return
    }

    if (!customerId) {
      toast.error('고객 정보를 찾을 수 없습니다')
      return
    }

    setIsLoading(true)

    try {
      if (isFavorite && favoriteId) {
        // 찜 해제
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('id', favoriteId)

        if (error) throw error

        setIsFavorite(false)
        setFavoriteId(null)
        toast.success('찜하기 해제 완료')
      } else {
        // 찜 추가
        const { data, error } = await supabase
          .from('favorites')
          .insert({
            customer_id: customerId,
            trainer_id: trainerId,
          })
          .select('id')
          .single()

        if (error) throw error

        setIsFavorite(true)
        setFavoriteId(data.id)
        toast.success('찜하기 완료')
      }

      // 페이지 새로고침 (찜한 트레이너 페이지에서 사용 시)
      router.refresh()
    } catch (error: any) {
      console.error('Error toggling favorite:', error)
      toast.error('찜하기 처리 실패', {
        description: error.message || '다시 시도해주세요.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 고객이 아니면 버튼 숨김
  if (!isCustomer) return null

  if (showLabel) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleToggleFavorite}
        disabled={isLoading}
        className={className}
      >
        <Heart
          className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-current text-red-500' : ''}`}
        />
        {isFavorite ? '찜 해제' : '찜하기'}
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className={`${isFavorite ? 'text-red-500 hover:text-red-600' : 'hover:text-red-500'} ${className} flex items-center justify-center`}
    >
      <Heart className={`${size === 'lg' ? 'h-9 w-9' : 'h-5 w-5'} ${isFavorite ? 'fill-current' : ''}`} />
    </Button>
  )
}
