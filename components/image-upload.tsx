'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface ImageUploadProps {
  onUpload: (url: string) => void
  onRemove?: (url: string) => void
  currentImages?: string[]
  maxImages?: number
  bucketName: string
  folder?: string
}

export function ImageUpload({
  onUpload,
  onRemove,
  currentImages = [],
  maxImages = 5,
  bucketName,
  folder = '',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // 최대 개수 체크
    if (currentImages.length + files.length > maxImages) {
      toast.error(`최대 ${maxImages}개까지만 업로드할 수 있습니다`)
      return
    }

    setIsUploading(true)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // 파일 크기 체크 (5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name}은(는) 5MB를 초과합니다`)
          continue
        }

        // 파일 타입 체크
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name}은(는) 이미지 파일이 아닙니다`)
          continue
        }

        // FormData 생성
        const formData = new FormData()
        formData.append('file', file)
        formData.append('bucketName', bucketName)
        if (folder) {
          formData.append('folder', folder)
        }

        // 업로드 API 호출
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '업로드 실패')
        }

        const { url } = await response.json()
        onUpload(url)
      }

      toast.success('이미지가 업로드되었습니다')

      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('이미지 업로드 오류:', error)
      toast.error(error instanceof Error ? error.message : '이미지 업로드에 실패했습니다')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = (url: string) => {
    if (onRemove) {
      onRemove(url)
    }
  }

  return (
    <div className="space-y-4">
      {/* 업로드 버튼 */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading || currentImages.length >= maxImages}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || currentImages.length >= maxImages}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              업로드 중...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              이미지 업로드
            </>
          )}
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentImages.length}/{maxImages}
        </span>
      </div>

      {/* 이미지 미리보기 그리드 */}
      {currentImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {currentImages.map((url, index) => (
            <div
              key={url}
              className="relative aspect-video rounded-lg overflow-hidden border bg-muted group"
            >
              <Image
                src={url}
                alt={`센터 이미지 ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemove(url)}
                  disabled={isUploading}
                >
                  <X className="w-4 h-4 mr-1" />
                  삭제
                </Button>
              </div>
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                  대표 이미지
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 안내 메시지 */}
      {currentImages.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-2">
            센터 사진을 업로드해주세요
          </p>
          <p className="text-xs text-muted-foreground">
            첫 번째 이미지가 대표 이미지로 표시됩니다 (최대 {maxImages}개, 각 5MB 이하)
          </p>
        </div>
      )}
    </div>
  )
}
