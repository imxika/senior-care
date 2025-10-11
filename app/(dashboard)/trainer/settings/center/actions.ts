'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface CenterData {
  name: string
  address: string
  phone?: string | null
  business_registration_number?: string | null
  description?: string | null
}

interface CreateOrUpdateCenterParams {
  trainerId: string
  centerId?: string
  centerData: CenterData
}

export async function createOrUpdateCenter({
  trainerId,
  centerId,
  centerData
}: CreateOrUpdateCenterParams) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // 트레이너 권한 확인
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .select('id, profile_id, center_id')
      .eq('id', trainerId)
      .eq('profile_id', user.id)
      .single()

    if (trainerError || !trainer) {
      return { error: 'Forbidden - 권한이 없습니다' }
    }

    let resultCenterId: string

    if (centerId) {
      // 기존 센터 수정
      const { data: updatedCenter, error: updateError } = await supabase
        .from('centers')
        .update({
          name: centerData.name,
          address: centerData.address,
          phone: centerData.phone,
          business_registration_number: centerData.business_registration_number,
          description: centerData.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', centerId)
        .select()
        .single()

      if (updateError) {
        console.error('센터 수정 오류:', updateError)
        return { error: '센터 정보 수정에 실패했습니다' }
      }

      resultCenterId = updatedCenter.id
    } else {
      // 이미 등록된 센터 개수 확인 (최대 3개)
      const { data: existingCenters, error: countError } = await supabase
        .from('centers')
        .select('id')
        .eq('owner_id', trainerId)

      if (countError) {
        console.error('센터 개수 확인 오류:', countError)
        return { error: '센터 개수 확인에 실패했습니다' }
      }

      if (existingCenters && existingCenters.length >= 3) {
        return { error: '최대 3개까지만 센터를 등록할 수 있습니다' }
      }

      // 새 센터 생성
      const { data: newCenter, error: createError } = await supabase
        .from('centers')
        .insert({
          name: centerData.name,
          address: centerData.address,
          phone: centerData.phone,
          business_registration_number: centerData.business_registration_number,
          description: centerData.description,
          owner_id: trainerId, // 센터 소유자 설정
          is_verified: false, // 관리자 승인 필요
          is_active: true,
        })
        .select()
        .single()

      if (createError) {
        console.error('센터 생성 오류:', createError)
        console.error('센터 데이터:', { name: centerData.name, address: centerData.address, owner_id: trainerId })
        return { error: `센터 등록에 실패했습니다: ${createError.message}` }
      }

      resultCenterId = newCenter.id

      // 첫 번째 센터인 경우 자동으로 주 근무지로 설정
      if (!trainer.center_id) {
        const { error: linkError } = await supabase
          .from('trainers')
          .update({ center_id: resultCenterId })
          .eq('id', trainerId)

        if (linkError) {
          console.error('주 근무지 설정 오류:', linkError)
          // 에러 발생해도 센터는 생성된 상태로 유지 (나중에 수동 설정 가능)
        }
      }
    }

    revalidatePath('/trainer/settings/center')
    revalidatePath('/trainer/settings')
    revalidatePath('/trainer/dashboard')

    return { success: true, centerId: resultCenterId }
  } catch (error) {
    console.error('센터 저장 오류:', error)
    return { error: '알 수 없는 오류가 발생했습니다' }
  }
}

export async function deleteCenter(centerId: string) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    // 트레이너 확인 및 권한 검증
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .select('id, center_id')
      .eq('profile_id', user.id)
      .single()

    if (trainerError || !trainer) {
      return { error: 'Forbidden - 권한이 없습니다' }
    }

    // 센터 소유자 확인
    const { data: center, error: centerError } = await supabase
      .from('centers')
      .select('owner_id, is_verified')
      .eq('id', centerId)
      .single()

    if (centerError || !center) {
      return { error: '센터를 찾을 수 없습니다' }
    }

    if (center.owner_id !== trainer.id) {
      return { error: 'Forbidden - 본인이 소유한 센터만 삭제할 수 있습니다' }
    }

    if (center.is_verified) {
      return { error: '승인된 센터는 삭제할 수 없습니다. 관리자에게 문의하세요.' }
    }

    // 이 센터를 주 근무지로 사용 중인지 확인
    if (trainer.center_id === centerId) {
      // 주 근무지 연결 해제
      const { error: unlinkError } = await supabase
        .from('trainers')
        .update({ center_id: null })
        .eq('id', trainer.id)

      if (unlinkError) {
        console.error('주 근무지 연결 해제 오류:', unlinkError)
        return { error: '주 근무지 연결 해제에 실패했습니다' }
      }
    }

    // 센터 삭제 (RLS에서 승인 전 + 소유자만 체크)
    const { error: deleteError } = await supabase
      .from('centers')
      .delete()
      .eq('id', centerId)

    if (deleteError) {
      console.error('센터 삭제 오류:', deleteError)
      return { error: '센터 삭제에 실패했습니다' }
    }

    revalidatePath('/trainer/settings/center')
    revalidatePath('/trainer/settings')
    revalidatePath('/trainer/dashboard')

    return { success: true }
  } catch (error) {
    console.error('센터 삭제 오류:', error)
    return { error: '알 수 없는 오류가 발생했습니다' }
  }
}
