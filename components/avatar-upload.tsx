'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  userId: string
  userName?: string
  onUploadComplete?: (url: string) => void
}

export function AvatarUpload({
  currentAvatarUrl,
  userId,
  userName,
  onUploadComplete,
}: AvatarUploadProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다')
      return
    }

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('파일 크기는 5MB 이하여야 합니다')
      return
    }

    setIsUploading(true)

    try {
      const supabase = createClient()

      // 파일명 생성 (userId + timestamp)
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Supabase Storage에 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        toast.error('업로드 실패', {
          description: uploadError.message,
        })
        setIsUploading(false)
        return
      }

      // 공개 URL 가져오기
      const { data: urlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath)

      const publicUrl = urlData.publicUrl

      // profiles 테이블 업데이트
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (updateError) {
        console.error('Update error:', updateError)
        toast.error('프로필 업데이트 실패')
        setIsUploading(false)
        return
      }

      // 이전 아바타 삭제 (선택사항)
      if (currentAvatarUrl && currentAvatarUrl.includes('avatars/')) {
        const oldPath = currentAvatarUrl.split('/avatars/')[1]
        if (oldPath) {
          await supabase.storage.from('profiles').remove([`avatars/${oldPath}`])
        }
      }

      setPreviewUrl(publicUrl)
      toast.success('프로필 사진이 업데이트되었습니다')

      if (onUploadComplete) {
        onUploadComplete(publicUrl)
      }

      router.refresh()
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error('업로드 중 오류가 발생했습니다')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="h-32 w-32">
          <AvatarImage src={previewUrl || ''} alt={userName || '프로필'} />
          <AvatarFallback className="text-3xl">
            {userName?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>

        {/* 오버레이 버튼 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          ) : (
            <Camera className="h-8 w-8 text-white" />
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            업로드 중...
          </>
        ) : (
          <>
            <Camera className="h-4 w-4 mr-2" />
            사진 변경
          </>
        )}
      </Button>
    </div>
  )
}
