import { createClient } from '@/lib/supabase/server'

/**
 * Platform Pricing Policy Structure (from DB)
 */
export interface PlatformPricingPolicy {
  id: string
  commission_recommended: number
  commission_direct: number
  duration_discounts: {
    '60': number
    '90': number
    '120': number
  }
  session_prices: {
    '1:1': number
    '2:1': number
    '3:1': number
  }
  is_active: boolean
  effective_from: string
  created_at: string
  updated_at: string
}

/**
 * Trainer Pricing Config Structure (JSONB in trainers.pricing_config)
 */
export interface TrainerPricingConfig {
  use_platform_default: boolean
  custom_hourly_rate: number | null
  accept_recommended: boolean
  custom_session_prices: {
    '1:1'?: number
    '2:1'?: number
    '3:1'?: number
  } | null
  custom_duration_discounts: {
    '60'?: number
    '90'?: number
    '120'?: number
  } | null
}

/**
 * Booking Type for Commission Calculation
 */
export type BookingType = 'recommended' | 'direct'

/**
 * Session Type
 */
export type SessionType = '1:1' | '2:1' | '3:1'

/**
 * Duration in minutes
 */
export type DurationMinutes = 60 | 90 | 120

/**
 * Price Calculation Result
 */
export interface PriceCalculation {
  base_price: number
  duration_discount_rate: number
  duration_discount_amount: number
  final_price: number
  commission_rate: number
  commission_amount: number
  trainer_payout: number
}

/**
 * Fetch active platform pricing policy
 */
export async function getActivePricingPolicy(): Promise<PlatformPricingPolicy | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('platform_pricing_policy')
    .select('*')
    .eq('is_active', true)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('Error fetching pricing policy:', error)
    return null
  }

  return data
}

/**
 * Get trainer's effective pricing configuration
 * Returns platform default if trainer uses default, or trainer's custom config
 */
export async function getTrainerPricing(trainerId: string): Promise<{
  config: TrainerPricingConfig
  policy: PlatformPricingPolicy
} | null> {
  const supabase = await createClient()

  // Fetch trainer's pricing config
  const { data: trainer, error: trainerError } = await supabase
    .from('trainers')
    .select('pricing_config, hourly_rate')
    .eq('id', trainerId)
    .single()

  if (trainerError) {
    console.error('Error fetching trainer pricing:', trainerError)
    return null
  }

  // Fetch platform policy
  const policy = await getActivePricingPolicy()
  if (!policy) {
    console.error('No active pricing policy found')
    return null
  }

  // Parse pricing config with fallback to default
  const config: TrainerPricingConfig = trainer.pricing_config || {
    use_platform_default: true,
    custom_hourly_rate: trainer.hourly_rate || null,
    accept_recommended: true,
    custom_session_prices: null,
    custom_duration_discounts: null,
  }

  return { config, policy }
}

/**
 * Get hourly rate for a trainer
 * Returns custom rate if set, otherwise platform default from session prices
 */
export function getHourlyRate(
  config: TrainerPricingConfig,
  policy: PlatformPricingPolicy
): number {
  if (!config.use_platform_default && config.custom_hourly_rate) {
    return config.custom_hourly_rate
  }

  // Platform default is the 1:1 session price
  return policy.session_prices['1:1']
}

/**
 * Get session price per person
 * Returns custom price if set, otherwise platform default
 */
export function getSessionPrice(
  sessionType: SessionType,
  config: TrainerPricingConfig,
  policy: PlatformPricingPolicy
): number {
  // Check if trainer has custom session price
  if (
    !config.use_platform_default &&
    config.custom_session_prices?.[sessionType]
  ) {
    return config.custom_session_prices[sessionType]
  }

  // Use platform default
  return policy.session_prices[sessionType]
}

/**
 * Get duration discount rate
 * Returns custom discount if set, otherwise platform default
 */
export function getDurationDiscount(
  duration: DurationMinutes,
  config: TrainerPricingConfig,
  policy: PlatformPricingPolicy
): number {
  // Check if trainer has custom duration discount
  if (
    !config.use_platform_default &&
    config.custom_duration_discounts?.[duration]
  ) {
    return config.custom_duration_discounts[duration]
  }

  // Use platform default
  return policy.duration_discounts[duration]
}

/**
 * Calculate total price with discounts
 *
 * @param sessionType - Session type (1:1, 2:1, 3:1)
 * @param duration - Duration in minutes (60, 90, 120)
 * @param config - Trainer pricing config
 * @param policy - Platform pricing policy
 * @returns Price calculation breakdown
 */
export function calculatePrice(
  sessionType: SessionType,
  duration: DurationMinutes,
  config: TrainerPricingConfig,
  policy: PlatformPricingPolicy
): Omit<PriceCalculation, 'commission_rate' | 'commission_amount' | 'trainer_payout'> {
  // Get hourly rate
  const hourlyRate = getHourlyRate(config, policy)

  // Calculate base price (hourly_rate * hours)
  const hours = duration / 60
  const basePrice = Math.round(hourlyRate * hours)

  // Get duration discount rate
  const discountRate = getDurationDiscount(duration, config, policy)

  // Calculate discount amount
  const discountAmount = Math.round(basePrice * (1 - discountRate))

  // Calculate final price
  const finalPrice = basePrice - discountAmount

  return {
    base_price: basePrice,
    duration_discount_rate: discountRate,
    duration_discount_amount: discountAmount,
    final_price: finalPrice,
  }
}

/**
 * Calculate commission based on booking type
 *
 * @param bookingType - Type of booking (recommended or direct)
 * @param finalPrice - Final price after discounts
 * @param policy - Platform pricing policy
 * @returns Commission rate and amount
 */
export function calculateCommission(
  bookingType: BookingType,
  finalPrice: number,
  policy: PlatformPricingPolicy
): {
  commission_rate: number
  commission_amount: number
} {
  const commissionRate =
    bookingType === 'recommended'
      ? policy.commission_recommended
      : policy.commission_direct

  const commissionAmount = Math.round((finalPrice * commissionRate) / 100)

  return {
    commission_rate: commissionRate,
    commission_amount: commissionAmount,
  }
}

/**
 * Calculate complete price breakdown including commission
 *
 * @param sessionType - Session type (1:1, 2:1, 3:1)
 * @param duration - Duration in minutes (60, 90, 120)
 * @param bookingType - Type of booking (recommended or direct)
 * @param trainerId - Trainer ID
 * @returns Complete price calculation or null if error
 */
export async function calculateCompletePrice(
  sessionType: SessionType,
  duration: DurationMinutes,
  bookingType: BookingType,
  trainerId: string
): Promise<PriceCalculation | null> {
  // Get trainer pricing
  const pricing = await getTrainerPricing(trainerId)
  if (!pricing) {
    return null
  }

  const { config, policy } = pricing

  // Calculate base price with discounts
  const priceBreakdown = calculatePrice(sessionType, duration, config, policy)

  // Calculate commission
  const commission = calculateCommission(
    bookingType,
    priceBreakdown.final_price,
    policy
  )

  // Calculate trainer payout
  const trainerPayout = priceBreakdown.final_price - commission.commission_amount

  return {
    ...priceBreakdown,
    ...commission,
    trainer_payout: trainerPayout,
  }
}

/**
 * Format price for display (Korean Won)
 */
export function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`
}

/**
 * Format commission rate for display
 */
export function formatCommissionRate(rate: number): string {
  return `${rate}%`
}
