'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateTrainerPricing(formData: FormData) {
  const supabase = await createClient()

  // Check authentication and trainer role
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'trainer') {
    return { error: '트레이너 권한이 필요합니다.' }
  }

  // Extract form data
  const trainerId = formData.get('trainer_id') as string
  const usePlatformDefault = formData.get('use_platform_default') === 'true'
  const acceptRecommended = formData.get('accept_recommended') === 'true'

  // Verify trainer ownership
  const { data: trainer } = await supabase
    .from('trainers')
    .select('id, profile_id')
    .eq('id', trainerId)
    .single()

  if (!trainer || trainer.profile_id !== user.id) {
    return { error: '권한이 없습니다.' }
  }

  // Build pricing config
  interface PricingConfig {
    use_platform_default: boolean
    accept_recommended: boolean
    custom_hourly_rate: number | null
    custom_session_prices: {
      '1:1': number
      '2:1': number
      '3:1': number
    } | null
    custom_duration_discounts: null
  }

  let pricingConfig: PricingConfig = {
    use_platform_default: usePlatformDefault,
    accept_recommended: acceptRecommended,
    custom_hourly_rate: null,
    custom_session_prices: null,
    custom_duration_discounts: null
  }

  // If custom pricing is enabled, add custom values
  if (!usePlatformDefault) {
    const customHourlyRate = parseInt(formData.get('custom_hourly_rate') as string)
    const customPrice1on1 = parseInt(formData.get('custom_price_1on1') as string)
    const customPrice2on1 = parseInt(formData.get('custom_price_2on1') as string)
    const customPrice3on1 = parseInt(formData.get('custom_price_3on1') as string)

    // Validate custom prices
    if (customHourlyRate < 0) {
      return { error: '시급은 0원 이상이어야 합니다.' }
    }
    if (customPrice1on1 < 0 || customPrice2on1 < 0 || customPrice3on1 < 0) {
      return { error: '가격은 0원 이상이어야 합니다.' }
    }

    pricingConfig = {
      use_platform_default: false,
      accept_recommended: acceptRecommended,
      custom_hourly_rate: customHourlyRate,
      custom_session_prices: {
        '1:1': customPrice1on1,
        '2:1': customPrice2on1,
        '3:1': customPrice3on1
      },
      custom_duration_discounts: null // Use platform default for now
    }
  }

  // Update trainer pricing config
  const { error: updateError } = await supabase
    .from('trainers')
    .update({
      pricing_config: pricingConfig,
      updated_at: new Date().toISOString()
    })
    .eq('id', trainerId)

  if (updateError) {
    console.error('Error updating trainer pricing:', updateError)
    return { error: `가격 설정 업데이트 중 오류가 발생했습니다: ${updateError.message}` }
  }

  // Revalidate the page to show updated data
  revalidatePath('/trainer/settings/pricing')

  return { success: true }
}
