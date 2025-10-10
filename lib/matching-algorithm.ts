/**
 * 트레이너 매칭 알고리즘
 *
 * trainer-match-list.tsx에서 추출한 점수 계산 로직
 * 추천 예약 시 적합한 트레이너를 찾고 점수를 계산
 */

import { PRICING } from './constants'

export interface TrainerForMatching {
  id: string
  profile_id: string
  years_experience: number | null
  certifications: string[] | null
  specialties: string[] | null
  bio: string | null
  hourly_rate: number | null
  home_visit_available: boolean
  center_visit_available: boolean
  service_areas: string[] | null
  profile: {
    full_name: string | null
    avatar_url: string | null
    phone: string | null
    email: string
  } | null
}

export interface ScoredTrainer extends TrainerForMatching {
  matchScore: number
  matchReasons: string[]
  isWithinBudget: boolean
  bookingCount: number
}

export interface BookingForMatching {
  serviceType: 'home_visit' | 'center_visit'
  specialty?: string
  address?: string
  bookingDate: string
  startTime: string
  endTime: string
}

/**
 * 트레이너 점수 계산 및 정렬
 */
export function scoreAndRankTrainers(
  trainers: TrainerForMatching[],
  booking: BookingForMatching,
  trainerBookingCounts: Record<string, number>
): ScoredTrainer[] {
  const { serviceType, specialty, address } = booking

  const scoredTrainers = trainers.map(trainer => {
    let score = 0
    const matchReasons: string[] = []

    // 1. 서비스 타입 매칭 (30점)
    if (serviceType === 'home_visit' && trainer.home_visit_available) {
      score += 30
      matchReasons.push('방문 서비스 가능')
    } else if (serviceType === 'center_visit' && trainer.center_visit_available) {
      score += 30
      matchReasons.push('센터 방문 가능')
    }

    // 2. 전문분야 매칭 (20점 x N)
    if (specialty && trainer.specialties) {
      const specialtyKeywords = specialty.split(/[,\s]+/).filter(Boolean)
      const matchedSpecialties = specialtyKeywords.filter(keyword =>
        trainer.specialties?.some(s => s.includes(keyword))
      )
      if (matchedSpecialties.length > 0) {
        score += matchedSpecialties.length * 20
        matchReasons.push(`전문분야 ${matchedSpecialties.length}개 일치`)
      }
    }

    // 3. 서비스 지역 매칭 (25점)
    if (address && trainer.service_areas) {
      const matchedArea = trainer.service_areas.some(area =>
        address.includes(area) || area.includes(address.split(' ')[0])
      )
      if (matchedArea) {
        score += 25
        matchReasons.push('서비스 지역 일치')
      }
    }

    // 4. 경력 가점 (최대 10점)
    if (trainer.years_experience) {
      score += Math.min(trainer.years_experience * 2, 10)
    }

    // 5. 자격증 가점 (3점 x N)
    if (trainer.certifications && trainer.certifications.length > 0) {
      score += trainer.certifications.length * 3
    }

    // 6. 가격 점수 (최대 15점)
    if (trainer.hourly_rate) {
      const priceRatio = trainer.hourly_rate / PRICING.RECOMMENDED_MAX_HOURLY_RATE
      if (priceRatio <= 0.8) {
        score += 15  // 매우 저렴 (80% 이하)
      } else if (priceRatio <= 1.0) {
        score += 10  // 적정 가격 (80-100%)
      } else if (priceRatio <= 1.2) {
        score += 5   // 약간 비쌈 (100-120%)
      }
      // 120% 초과는 가점 없음
    }

    // 7. 부하 분산 점수 (최대 20점)
    const bookingCount = trainerBookingCounts[trainer.id] || 0
    let workloadScore = 0
    let workloadReason = ''

    if (bookingCount === 0) {
      workloadScore = 20  // 예약 없음
      workloadReason = '현재 예약 없음'
    } else if (bookingCount <= 2) {
      workloadScore = 15  // 여유 있음
      workloadReason = `예약 ${bookingCount}건 (여유)`
    } else if (bookingCount <= 4) {
      workloadScore = 10  // 보통
      workloadReason = `예약 ${bookingCount}건 (보통)`
    } else if (bookingCount <= 6) {
      workloadScore = 5   // 많음
      workloadReason = `예약 ${bookingCount}건 (많음)`
    } else {
      workloadScore = 0   // 과부하
      workloadReason = `예약 ${bookingCount}건 (과부하)`
    }

    score += workloadScore
    if (workloadReason) {
      matchReasons.push(workloadReason)
    }

    return {
      ...trainer,
      matchScore: score,
      matchReasons,
      isWithinBudget: !trainer.hourly_rate || trainer.hourly_rate <= PRICING.RECOMMENDED_MAX_HOURLY_RATE,
      bookingCount
    }
  })

  // 점수순으로 정렬 (높은 점수 먼저)
  return scoredTrainers.sort((a, b) => b.matchScore - a.matchScore)
}

/**
 * 상위 N명의 트레이너 선택 (자동 알림용)
 */
export function selectTopTrainers(
  scoredTrainers: ScoredTrainer[],
  maxCount: number = 10
): ScoredTrainer[] {
  // 예산 내 트레이너 우선
  const withinBudget = scoredTrainers.filter(t => t.isWithinBudget)
  const outOfBudget = scoredTrainers.filter(t => !t.isWithinBudget)

  // 예산 내 트레이너가 충분하면 그것만
  if (withinBudget.length >= maxCount) {
    return withinBudget.slice(0, maxCount)
  }

  // 예산 내 트레이너가 부족하면 예산 외 트레이너도 포함
  return [
    ...withinBudget,
    ...outOfBudget.slice(0, maxCount - withinBudget.length)
  ]
}
