'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateTrainerProfile(formData: FormData) {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다' }
  }

  // 폼 데이터 추출
  const fullName = formData.get('full_name') as string
  const phone = formData.get('phone') as string
  const yearsExperience = parseInt(formData.get('years_experience') as string) || 0
  const hourlyRate = parseInt(formData.get('hourly_rate') as string) || 0
  const bio = formData.get('bio') as string
  const specialtiesInput = formData.get('specialties') as string
  const certificationsInput = formData.get('certifications') as string
  const serviceAreasInput = formData.get('service_areas') as string
  const maxGroupSize = parseInt(formData.get('max_group_size') as string) || 1
  const centerName = formData.get('center_name') as string
  const centerAddress = formData.get('center_address') as string

  // 최대 그룹 인원 검증 (1-3명: 1:1, 1:2, 1:3 세션만 지원)
  if (maxGroupSize < 1 || maxGroupSize > 3) {
    return { error: '최대 그룹 인원은 1명에서 3명 사이여야 합니다' }
  }

  // 배열로 변환 (쉼표로 구분된 문자열을 배열로)
  const specialties = specialtiesInput
    ? specialtiesInput.split(',').map(s => s.trim()).filter(s => s)
    : []
  const certifications = certificationsInput
    ? certificationsInput.split(',').map(s => s.trim()).filter(s => s)
    : []
  const serviceAreas = serviceAreasInput
    ? serviceAreasInput.split(',').map(s => s.trim()).filter(s => s)
    : []

  try {
    // 1. profiles 테이블 업데이트
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone: phone,
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      return { error: '프로필 업데이트 실패: ' + profileError.message }
    }

    // 2. trainers 테이블 업데이트
    const { error: trainerError } = await supabase
      .from('trainers')
      .update({
        years_experience: yearsExperience,
        hourly_rate: hourlyRate,
        bio: bio,
        specialties: specialties,
        certifications: certifications,
        service_areas: serviceAreas,
        max_group_size: maxGroupSize,
        center_name: centerName || null,
        center_address: centerAddress || null,
      })
      .eq('profile_id', user.id)

    if (trainerError) {
      console.error('Trainer update error:', trainerError)
      return { error: '트레이너 정보 업데이트 실패: ' + trainerError.message }
    }

    revalidatePath('/trainer/settings/profile')
    return { success: true }
  } catch (error) {
    console.error('Update error:', error)
    return { error: '업데이트 중 오류가 발생했습니다' }
  }
}
