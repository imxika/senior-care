'use client'

import { useState } from 'react'
import { Star, Calendar, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AvatarUpload } from '@/components/avatar-upload'
import { ProfileEditForm } from './profile-edit-form'

interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  user_type: string
  created_at: string
}

interface Trainer {
  id: string
  profile_id: string
  years_experience: number | null
  hourly_rate: number | null
  bio: string | null
  specialties: string[] | null
  certifications: string[] | null
  service_areas: string[] | null
  max_group_size: number | null
  center_name: string | null
  center_address: string | null
  rating: number | null
  total_reviews: number | null
  is_active: boolean
}

interface ProfileContentProps {
  profile: Profile | null
  trainer: Trainer | null
  userId: string
}

export function ProfileContent({ profile, trainer, userId }: ProfileContentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="flex flex-1 flex-col gap-3 p-4 md:gap-6 md:p-6">
      {/* 제목 */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">내 프로필</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          트레이너 프로필 정보를 확인하고 수정하세요
        </p>
      </div>

      {/* 프로필 사진 - 항상 표시 */}
      <Card>
        <CardHeader className="px-4 md:px-6 pt-4 md:pt-6">
          <CardTitle className="text-base md:text-lg">프로필 사진</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-4 md:py-6 px-4 md:px-6">
          <AvatarUpload
            currentAvatarUrl={profile?.avatar_url}
            userId={userId}
            userName={profile?.full_name ?? undefined}
          />
        </CardContent>
      </Card>

      {/* 읽기 전용 통계 정보 */}
      {trainer && (
        <Card>
          <CardHeader className="px-4 md:px-6 pt-4 md:pt-6">
            <CardTitle className="text-base md:text-lg">통계</CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
            <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
              <div className="space-y-1.5 md:space-y-2">
                <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground">
                  <Star className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                  <span>평점</span>
                </div>
                <p className="font-medium text-sm md:text-base">
                  {trainer.rating || '5.0'} ({trainer.total_reviews || 0}개)
                </p>
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <p className="text-xs md:text-sm text-muted-foreground">활성 상태</p>
                <Badge variant={trainer.is_active ? 'default' : 'secondary'} className="text-xs md:text-sm">
                  {trainer.is_active ? '활성화' : '비활성화'}
                </Badge>
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                  <span>가입일</span>
                </div>
                <p className="font-medium text-sm md:text-base">
                  {new Date(profile?.created_at || '').toLocaleDateString('ko-KR')}
                </p>
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <p className="text-xs md:text-sm text-muted-foreground">이메일</p>
                <p className="font-medium text-xs md:text-sm break-all">{profile?.email || '이메일 없음'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 편집 가능한 프로필 정보 */}
      {profile && trainer && (
        <ProfileEditForm
          profile={{
            full_name: profile.full_name || undefined,
            phone: profile.phone || undefined,
            email: profile.email || undefined
          }}
          trainer={{
            years_experience: trainer.years_experience || undefined,
            hourly_rate: trainer.hourly_rate || undefined,
            bio: trainer.bio || undefined,
            specialties: trainer.specialties || undefined,
            certifications: trainer.certifications || undefined,
            service_areas: trainer.service_areas || undefined,
            max_group_size: trainer.max_group_size || undefined
          }}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onLoadingChange={setIsLoading}
        />
      )}

      {/* 편집/저장 버튼 - 하단 고정 */}
      <div
        className="relative flex gap-2 md:gap-3 sticky bottom-4 p-3 md:p-4 rounded-lg border shadow-lg"
        style={{
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(6px)',
          backgroundColor: 'rgba(255, 255, 255, 0.4)'
        }}
      >
        {isEditing ? (
          <>
            <Button
              onClick={() => setIsEditing(false)}
              variant="outline"
              className="h-11 md:h-12 flex-1 relative z-10"
            >
              취소
            </Button>
            <Button
              type="submit"
              form="profile-form"
              disabled={isLoading}
              className="h-11 md:h-12 flex-1 relative z-10"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </>
        ) : (
          <Button
            onClick={() => setIsEditing(true)}
            className="h-11 md:h-12 w-full relative z-10"
          >
            프로필 편집
          </Button>
        )}
      </div>
    </div>
  )
}
