'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

interface Customer {
  id: string
  profile_id: string
  age: number | null
  birth_date: string | null
  gender: string | null
  address: string | null
  address_detail: string | null
  guardian_name: string | null
  guardian_relationship: string | null
  guardian_phone: string | null
  mobility_level: string | null
  medical_conditions: string[] | null
  notes: string | null
}

interface ProfileContentProps {
  profile: Profile | null
  customer: Customer | null
  userId: string
}

export function ProfileContent({ profile, customer, userId }: ProfileContentProps) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:gap-8 md:p-8 pb-32 max-w-[1400px] mx-auto w-full">
      {/* 제목 */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">내 프로필</h1>
        <p className="text-lg md:text-xl text-muted-foreground">
          고객 프로필 정보를 확인하고 수정하세요
        </p>
      </div>

      {/* 프로필 사진 - 항상 표시 */}
      <Card className="border-2">
        <CardHeader className="p-6">
          <CardTitle className="text-xl md:text-2xl">프로필 사진</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6 px-6">
          <div className="w-full max-w-xs">
            <AvatarUpload
              currentAvatarUrl={profile?.avatar_url}
              userId={userId}
              userName={profile?.full_name ?? undefined}
            />
          </div>
        </CardContent>
      </Card>

      {/* 읽기 전용 계정 정보 */}
      <Card className="border-2">
        <CardHeader className="p-6">
          <CardTitle className="text-xl md:text-2xl">계정 정보</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="grid gap-5 md:gap-6 grid-cols-1 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-base md:text-lg text-muted-foreground font-medium">이메일</p>
              <p className="font-medium text-lg md:text-xl break-all">{profile?.email || '이메일 없음'}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-base md:text-lg text-muted-foreground font-medium">
                <Calendar className="h-5 w-5 shrink-0" />
                <span>가입일</span>
              </div>
              <p className="font-medium text-lg md:text-xl">
                {new Date(profile?.created_at || '').toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 편집 가능한 프로필 정보 */}
      <ProfileEditForm profile={profile} customer={customer} isEditing={isEditing} setIsEditing={setIsEditing} />

      {/* 편집/저장 버튼 - 하단 고정 */}
      <div
        className="relative flex gap-3 md:gap-4 sticky bottom-4 p-4 md:p-5 rounded-lg border-2 shadow-lg max-w-full md:max-w-xl md:ml-auto"
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
              className="h-14 flex-1 relative z-10 text-lg md:text-xl"
            >
              취소
            </Button>
            <Button
              type="submit"
              form="profile-form"
              className="h-14 flex-1 relative z-10 text-lg md:text-xl"
            >
              저장
            </Button>
          </>
        ) : (
          <Button
            onClick={() => setIsEditing(true)}
            className="h-14 w-full relative z-10 text-lg md:text-xl"
          >
            프로필 편집
          </Button>
        )}
      </div>
    </div>
  )
}
