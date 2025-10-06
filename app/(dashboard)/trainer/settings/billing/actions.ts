'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateBillingInfo(formData: FormData) {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '인증이 필요합니다' }
  }

  // 트레이너 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'trainer') {
    return { error: '트레이너 권한이 필요합니다' }
  }

  // 트레이너 정보 가져오기
  const { data: trainer } = await supabase
    .from('trainers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!trainer) {
    return { error: '트레이너 정보를 찾을 수 없습니다' }
  }

  // 폼 데이터 추출
  const bankName = formData.get('bank_name') as string
  const accountNumber = formData.get('account_number') as string
  const accountHolderName = formData.get('account_holder_name') as string
  const isBusiness = formData.get('is_business') === 'true'
  const businessNumber = formData.get('business_registration_number') as string

  // 유효성 검사
  if (!bankName || !accountNumber || !accountHolderName) {
    return { error: '필수 정보를 모두 입력해주세요' }
  }

  if (isBusiness && !businessNumber) {
    return { error: '사업자 등록번호를 입력해주세요' }
  }

  // 계좌번호 형식 검증 (숫자만)
  if (!/^\d+$/.test(accountNumber)) {
    return { error: '계좌번호는 숫자만 입력 가능합니다' }
  }

  // 사업자 등록번호 형식 검증 (10자리 숫자)
  if (isBusiness && businessNumber && !/^\d{10}$/.test(businessNumber)) {
    return { error: '사업자 등록번호는 10자리 숫자여야 합니다' }
  }

  // 계좌 정보 업데이트
  const { error } = await supabase
    .from('trainers')
    .update({
      bank_name: bankName,
      account_number: accountNumber,
      account_holder_name: accountHolderName,
      is_business: isBusiness,
      business_registration_number: isBusiness ? businessNumber : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', trainer.id)

  if (error) {
    console.error('계좌 정보 업데이트 오류:', error)
    return { error: '계좌 정보 업데이트에 실패했습니다' }
  }

  revalidatePath('/trainer/settings/billing')
  return { success: true }
}
