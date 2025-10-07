"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, Star, Briefcase, DollarSign, Home, Building2, CheckCircle2 } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { PRICING } from "@/lib/constants"
import { matchTrainerToBooking } from "./actions"

interface Trainer {
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

interface TrainerMatchListProps {
  trainers: Trainer[]
  bookingId: string
  serviceType: string
  specialty: string
  address: string
  bookingDate: string
  startTime: string
  endTime: string
  trainerBookingCounts: Record<string, number>
}

export function TrainerMatchList({
  trainers,
  bookingId,
  serviceType,
  specialty,
  address,
  bookingDate,
  startTime,
  endTime,
  trainerBookingCounts
}: TrainerMatchListProps) {
  const router = useRouter()
  const [matchingId, setMatchingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showAllTrainers, setShowAllTrainers] = useState(false)

  // 트레이너 필터링 및 점수 계산
  const scoredTrainers = trainers.map(trainer => {
    let score = 0
    const matchReasons: string[] = []

    // 1. 서비스 타입 매칭
    if (serviceType === 'home_visit' && trainer.home_visit_available) {
      score += 30
      matchReasons.push('방문 서비스 가능')
    } else if (serviceType === 'center_visit' && trainer.center_visit_available) {
      score += 30
      matchReasons.push('센터 방문 가능')
    }

    // 2. 전문분야 매칭
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

    // 3. 서비스 지역 매칭
    if (address && trainer.service_areas) {
      const matchedArea = trainer.service_areas.some(area =>
        address.includes(area) || area.includes(address.split(' ')[0])
      )
      if (matchedArea) {
        score += 25
        matchReasons.push('서비스 지역 일치')
      }
    }

    // 4. 경력 가점
    if (trainer.years_experience) {
      score += Math.min(trainer.years_experience * 2, 10)
    }

    // 5. 자격증 가점
    if (trainer.certifications && trainer.certifications.length > 0) {
      score += trainer.certifications.length * 3
    }

    // 6. 가격 점수 (저렴할수록 높은 점수)
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

    // 7. 부하 분산 점수 (예약이 적을수록 높은 점수)
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

  // 예산 필터링
  const filteredTrainers = showAllTrainers
    ? scoredTrainers
    : scoredTrainers.filter(t => t.isWithinBudget)

  // 점수순으로 정렬
  const sortedTrainers = filteredTrainers.sort((a, b) => b.matchScore - a.matchScore)

  // 예산 외 트레이너 수
  const outOfBudgetCount = scoredTrainers.filter(t => !t.isWithinBudget).length

  async function handleMatch(trainerId: string) {
    console.log('🔴🔴🔴 handleMatch CALLED - CLIENT SIDE')
    console.log('trainerId:', trainerId)
    console.log('bookingId:', bookingId)

    setMatchingId(trainerId)
    setError(null)
    setSuccess(false)

    console.log('🔵 Calling matchTrainerToBooking Server Action...')
    const result = await matchTrainerToBooking(bookingId, trainerId)
    console.log('🟢 Server Action result:', result)

    if ('error' in result) {
      setError(result.error)
      setMatchingId(null)
    } else {
      // 성공 - 피드백 표시 후 매칭된 예약 상세 페이지로 이동
      setSuccess(true)
      setTimeout(() => {
        // Navigate to the matched booking detail page
        window.location.href = `/admin/bookings/${bookingId}`
      }, 1500)
    }
  }

  if (sortedTrainers.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">등록된 트레이너가 없습니다.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="space-y-1">
              <p className="font-bold">✓ 트레이너 매칭 완료</p>
              <p className="text-sm">트레이너에게 승인 요청을 보냈습니다.</p>
              <p className="text-sm text-green-600">예약 상세 페이지로 이동합니다...</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            적합한 트레이너 ({sortedTrainers.length}명)
          </h2>
          <p className="text-sm text-gray-500">
            매칭 점수순으로 정렬됨
          </p>
        </div>

        {/* 예산 필터 토글 */}
        {outOfBudgetCount > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Checkbox
              id="show-all"
              checked={showAllTrainers}
              onCheckedChange={(checked) => setShowAllTrainers(checked === true)}
            />
            <label
              htmlFor="show-all"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              예산 범위 밖 트레이너도 표시 ({outOfBudgetCount}명)
            </label>
            <span className="text-xs text-gray-500 ml-auto">
              추천 예산: {formatPrice(PRICING.RECOMMENDED_MAX_HOURLY_RATE)} 이하
            </span>
          </div>
        )}
      </div>

      {sortedTrainers.map((trainer, index) => (
        <Card key={trainer.id} className={index === 0 ? "border-blue-300 shadow-md" : ""}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-500" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {trainer.profile?.full_name || trainer.profile?.email?.split('@')[0] || '트레이너'}
                    {index === 0 && (
                      <Badge className="bg-blue-500">최고 매칭</Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    매칭 점수: {trainer.matchScore}점
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatPrice(trainer.hourly_rate)}</p>
                <p className="text-xs text-gray-500">시간당</p>
                {!trainer.isWithinBudget && (
                  <Badge variant="outline" className="mt-1 text-xs text-orange-600 border-orange-300">
                    예산 초과
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* 매칭 이유 */}
            {trainer.matchReasons.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {trainer.matchReasons.map((reason, i) => (
                  <Badge key={i} variant="secondary" className="bg-green-100 text-green-700">
                    ✓ {reason}
                  </Badge>
                ))}
              </div>
            )}

            {/* 트레이너 정보 */}
            <div className="grid gap-2">
              {trainer.years_experience && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-gray-500" />
                  <span>경력 {trainer.years_experience}년</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                {trainer.home_visit_available && (
                  <Badge variant="outline" className="text-xs">
                    <Home className="h-3 w-3 mr-1" />
                    방문 가능
                  </Badge>
                )}
                {trainer.center_visit_available && (
                  <Badge variant="outline" className="text-xs">
                    <Building2 className="h-3 w-3 mr-1" />
                    센터 가능
                  </Badge>
                )}
              </div>

              {trainer.specialties && trainer.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {trainer.specialties.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}

              {trainer.service_areas && trainer.service_areas.length > 0 && (
                <div className="text-sm text-gray-600">
                  서비스 지역: {trainer.service_areas.join(', ')}
                </div>
              )}

              {trainer.bio && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {trainer.bio}
                </p>
              )}
            </div>

            {/* 매칭 버튼 */}
            <Button
              onClick={() => handleMatch(trainer.id)}
              disabled={matchingId !== null}
              className="w-full"
              variant={index === 0 ? "default" : "outline"}
            >
              {matchingId === trainer.id ? "매칭 중..." : "이 트레이너로 매칭"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
