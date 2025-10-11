/**
 * Client-side pricing calculations
 * This file can be imported in client components
 */

import type { TrainerPricingConfig, PlatformPricingPolicy, SessionType, DurationMinutes, PriceCalculation } from './pricing-utils'

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
