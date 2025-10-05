'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface RemoveFavoriteButtonProps {
  favoriteId: string
}

export function RemoveFavoriteButton({ favoriteId }: RemoveFavoriteButtonProps) {
  const router = useRouter()
  const [isRemoving, setIsRemoving] = useState(false)

  const handleRemove = async () => {
    if (!confirm('즐겨찾기를 해제하시겠습니까?')) {
      return
    }

    setIsRemoving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', favoriteId)

    setIsRemoving(false)

    if (error) {
      console.error('Error removing favorite:', error)
      toast.error('즐겨찾기 해제 실패', {
        description: '다시 시도해주세요.',
      })
      return
    }

    toast.success('즐겨찾기 해제 완료')
    router.refresh()
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRemove}
      disabled={isRemoving}
      className="text-red-500 hover:text-red-600 hover:bg-red-50"
    >
      <Heart className="h-5 w-5 fill-current" />
    </Button>
  )
}
