// ====================================
// 시니어케어 플랫폼 상수 정의
// ====================================
// NOTE: 현재는 시니어케어에 최적화
// 다른 도메인 전환 시 이 파일 수정 필요

// ====================================
// 역할 (User Roles)
// ====================================
export const ROLES = {
  ADMIN: "admin",
  TRAINER: "trainer",
  CUSTOMER: "customer"
} as const

export type UserRole = typeof ROLES[keyof typeof ROLES]

// ====================================
// 서비스 타입 (Service Types)
// ====================================
export const SERVICE_TYPES = {
  HOME_VISIT: "home_visit",
  CENTER_VISIT: "center_visit"
} as const

export type ServiceType = typeof SERVICE_TYPES[keyof typeof SERVICE_TYPES]

// 서비스 타입 라벨
export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [SERVICE_TYPES.HOME_VISIT]: "방문 서비스",
  [SERVICE_TYPES.CENTER_VISIT]: "센터 방문"
}

// ====================================
// 예약 타입 (Booking Type)
// ====================================
export const BOOKING_TYPE = {
  DIRECT: "direct",           // 지정 예약 (고객이 트레이너 선택, +30% 비용)
  RECOMMENDED: "recommended"  // 추천 예약 (관리자 매칭, 기본 비용)
} as const

export type BookingType = typeof BOOKING_TYPE[keyof typeof BOOKING_TYPE]

// 예약 타입 설정
export const BOOKING_TYPE_CONFIG = {
  [BOOKING_TYPE.DIRECT]: {
    label: "지정 예약",
    description: "원하는 트레이너를 직접 선택합니다",
    priceMultiplier: 1.3,
    badge: "프리미엄",
    color: "text-blue-600"
  },
  [BOOKING_TYPE.RECOMMENDED]: {
    label: "추천 예약",
    description: "관리자가 최적의 트레이너를 매칭해드립니다",
    priceMultiplier: 1.0,
    badge: "일반",
    color: "text-green-600"
  }
} as const

// ====================================
// 예약 상태 (Booking Status)
// ====================================
export const BOOKING_STATUS = {
  PENDING_PAYMENT: "pending_payment",  // 결제 대기 (예약 생성됨, 결제 미완료)
  PENDING: "pending",                  // 트레이너 승인 대기 (결제 완료됨)
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  REJECTED: "rejected",
  NO_SHOW: "no_show",
  EXPIRED: "expired"                   // 만료됨 (결제 시간 초과)
} as const

export type BookingStatus = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS]

// 예약 상태 설정
export const BOOKING_STATUS_CONFIG = {
  [BOOKING_STATUS.PENDING_PAYMENT]: {
    label: "결제 대기",
    variant: "outline" as const,
    color: "text-blue-600"
  },
  [BOOKING_STATUS.PENDING]: {
    label: "승인 대기",
    variant: "secondary" as const,
    color: "text-yellow-600"
  },
  [BOOKING_STATUS.CONFIRMED]: {
    label: "확정됨",
    variant: "default" as const,
    color: "text-green-600"
  },
  [BOOKING_STATUS.COMPLETED]: {
    label: "완료됨",
    variant: "outline" as const,
    color: "text-gray-600"
  },
  [BOOKING_STATUS.CANCELLED]: {
    label: "취소됨",
    variant: "destructive" as const,
    color: "text-red-600"
  },
  [BOOKING_STATUS.REJECTED]: {
    label: "거절됨",
    variant: "destructive" as const,
    color: "text-red-600"
  },
  [BOOKING_STATUS.NO_SHOW]: {
    label: "노쇼",
    variant: "destructive" as const,
    color: "text-red-600"
  },
  [BOOKING_STATUS.EXPIRED]: {
    label: "만료됨",
    variant: "outline" as const,
    color: "text-gray-500"
  }
} as const

// ====================================
// 예약 설정 (Booking Configuration)
// ====================================
export const BOOKING_CONFIG = {
  DURATION_MINUTES: 30,
  ADVANCE_BOOKING_DAYS: 30,
  CANCELLATION_HOURS: 24,
  MIN_DURATION_MINUTES: 30,
  MAX_DURATION_MINUTES: 180
} as const

// ====================================
// 취소 정책 (Cancellation Policy)
// ====================================
export const CANCELLATION_POLICY = {
  // 취소 수수료율 (예약일 기준)
  FEES: {
    DAYS_7_PLUS: 0,      // 7일 전: 무료 취소
    DAYS_3_TO_7: 0.3,    // 3-7일 전: 30% 수수료
    DAYS_1_TO_3: 0.5,    // 1-3일 전: 50% 수수료
    HOURS_24: 0.8,       // 24시간 이내: 80% 수수료
    NO_SHOW: 1.0         // 노쇼: 100% 수수료
  },
  // 최소 취소 가능 시간 (24시간 전까지만 취소 가능)
  MIN_CANCELLATION_HOURS: 24
} as const

// 취소 사유 (Cancellation Reasons)
export const CANCELLATION_REASONS = {
  SCHEDULE_CHANGE: "schedule_change",
  HEALTH_ISSUE: "health_issue",
  WEATHER: "weather",
  PERSONAL: "personal",
  TRAINER_ISSUE: "trainer_issue",
  OTHER: "other"
} as const

export type CancellationReason = typeof CANCELLATION_REASONS[keyof typeof CANCELLATION_REASONS]

export const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  [CANCELLATION_REASONS.SCHEDULE_CHANGE]: "일정 변경",
  [CANCELLATION_REASONS.HEALTH_ISSUE]: "건강 문제",
  [CANCELLATION_REASONS.WEATHER]: "날씨/교통",
  [CANCELLATION_REASONS.PERSONAL]: "개인 사정",
  [CANCELLATION_REASONS.TRAINER_ISSUE]: "트레이너 문제",
  [CANCELLATION_REASONS.OTHER]: "기타"
}

// ====================================
// 가격 설정 (Pricing Configuration)
// ====================================
export const PRICING = {
  CURRENCY: "KRW",
  DEFAULT_HOURLY_RATE: 100000,
  PLATFORM_FEE_PERCENT: 15,
  MIN_HOURLY_RATE: 50000,
  MAX_HOURLY_RATE: 200000,
  RECOMMENDED_MAX_HOURLY_RATE: 100000,  // 추천 예약용 최대 시급 (기본 필터)
  // 세션 타입별 기본 가격 (1회당, 랜딩 페이지 기준)
  SESSION_PRICES: {
    '1:1': 100000,   // 1:1 프리미엄 (1인)
    '2:1': 75000,    // 1:2 듀얼 (1인당)
    '3:1': 55000,    // 1:3 그룹 (1인당)
  }
} as const

// ====================================
// 전문 분야 (Specializations)
// ====================================
// TODO: 나중에 템플릿화 시 DB에서 관리
export const SPECIALIZATIONS = [
  "재활 운동",
  "물리 치료",
  "요가",
  "필라테스",
  "근력 운동",
  "중풍재활",
  "관절통증",
  "척추재활",
  "균형감각",
  "낙상예방",
  "보행훈련"
] as const

// ====================================
// 거동 수준 (Mobility Levels)
// ====================================
export const MOBILITY_LEVELS = {
  INDEPENDENT: "independent",
  ASSISTED: "assisted",
  WHEELCHAIR: "wheelchair",
  BEDRIDDEN: "bedridden"
} as const

export type MobilityLevel = typeof MOBILITY_LEVELS[keyof typeof MOBILITY_LEVELS]

export const MOBILITY_LEVEL_LABELS: Record<MobilityLevel, string> = {
  [MOBILITY_LEVELS.INDEPENDENT]: "독립 보행",
  [MOBILITY_LEVELS.ASSISTED]: "보조 필요",
  [MOBILITY_LEVELS.WHEELCHAIR]: "휠체어",
  [MOBILITY_LEVELS.BEDRIDDEN]: "침상 안정"
}

// ====================================
// 성별 (Gender)
// ====================================
export const GENDER = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other"
} as const

export type Gender = typeof GENDER[keyof typeof GENDER]

export const GENDER_LABELS: Record<Gender, string> = {
  [GENDER.MALE]: "남성",
  [GENDER.FEMALE]: "여성",
  [GENDER.OTHER]: "기타"
}

// ====================================
// 서울 지역 (Seoul Areas)
// ====================================
// TODO: 나중에 템플릿화 시 config로 분리
export const SEOUL_DISTRICTS = [
  "강남구",
  "강동구",
  "강북구",
  "강서구",
  "관악구",
  "광진구",
  "구로구",
  "금천구",
  "노원구",
  "도봉구",
  "동대문구",
  "동작구",
  "마포구",
  "서대문구",
  "서초구",
  "성동구",
  "성북구",
  "송파구",
  "양천구",
  "영등포구",
  "용산구",
  "은평구",
  "종로구",
  "중구",
  "중랑구"
] as const
