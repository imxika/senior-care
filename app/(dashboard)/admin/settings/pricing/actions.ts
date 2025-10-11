'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updatePricingPolicy(formData: FormData) {
  const supabase = await createClient()

  // Check authentication and admin role
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'admin') {
    return { error: '관리자 권한이 필요합니다.' }
  }

  // Extract form data
  const policyId = formData.get('policy_id') as string
  const commissionRecommended = parseInt(formData.get('commission_recommended') as string)
  const commissionDirect = parseInt(formData.get('commission_direct') as string)
  const discount60 = parseFloat(formData.get('discount_60') as string)
  const discount90 = parseFloat(formData.get('discount_90') as string)
  const discount120 = parseFloat(formData.get('discount_120') as string)
  const price1on1 = parseInt(formData.get('price_1on1') as string)
  const price2on1 = parseInt(formData.get('price_2on1') as string)
  const price3on1 = parseInt(formData.get('price_3on1') as string)

  // Validate commission rates
  if (commissionRecommended < 0 || commissionRecommended > 100) {
    return { error: '추천 예약 수수료는 0-100% 사이여야 합니다.' }
  }
  if (commissionDirect < 0 || commissionDirect > 100) {
    return { error: '지정 예약 수수료는 0-100% 사이여야 합니다.' }
  }

  // Validate discount rates
  if (discount60 < 0 || discount60 > 1 || discount90 < 0 || discount90 > 1 || discount120 < 0 || discount120 > 1) {
    return { error: '할인율은 0-100% 사이여야 합니다.' }
  }

  // Validate prices
  if (price1on1 < 0 || price2on1 < 0 || price3on1 < 0) {
    return { error: '가격은 0원 이상이어야 합니다.' }
  }

  // Build JSONB objects
  const durationDiscounts = {
    '60': discount60,
    '90': discount90,
    '120': discount120
  }

  const sessionPrices = {
    '1:1': price1on1,
    '2:1': price2on1,
    '3:1': price3on1
  }

  // Update pricing policy
  const { error: updateError } = await supabase
    .from('platform_pricing_policy')
    .update({
      commission_recommended: commissionRecommended,
      commission_direct: commissionDirect,
      duration_discounts: durationDiscounts,
      session_prices: sessionPrices,
      updated_at: new Date().toISOString()
    })
    .eq('id', policyId)

  if (updateError) {
    console.error('Error updating pricing policy:', updateError)
    return { error: `가격 정책 업데이트 중 오류가 발생했습니다: ${updateError.message}` }
  }

  // Revalidate the page to show updated data
  revalidatePath('/admin/settings/pricing')

  return { success: true }
}
