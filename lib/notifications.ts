import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export type NotificationType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_completed'
  | 'booking_pending'
  | 'booking_rejected'
  | 'booking_matched'
  | 'system'

interface CreateNotificationParams {
  userId: string
  title: string
  message: string
  type: NotificationType
  link?: string  // related_id 대신 link 사용
}

export async function createNotification({
  userId,
  title,
  message,
  type,
  link
}: CreateNotificationParams) {
  // RLS를 우회하기 위해 Service Role 키 사용
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      type,
      link  // link 컬럼에 예약 상세 페이지 URL 등을 저장
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create notification:', error)
    return null
  }

  return data
}

// 예약 관련 알림 템플릿
export const notificationTemplates = {
  // 트레이너가 예약 승인했을 때 (고객에게)
  bookingConfirmed: (trainerName: string, scheduledAt: Date) => ({
    title: '예약이 확정되었습니다',
    message: `${trainerName} 트레이너가 예약을 승인했습니다. 예약 일시: ${scheduledAt.toLocaleString('ko-KR')}`,
    type: 'booking_confirmed' as NotificationType
  }),

  // 트레이너가 예약 거절했을 때 (고객에게)
  bookingRejected: (trainerName: string) => ({
    title: '예약이 거절되었습니다',
    message: `${trainerName} 트레이너가 예약을 거절했습니다. 다른 트레이너를 찾아보세요.`,
    type: 'booking_rejected' as NotificationType
  }),

  // 고객이 예약 취소했을 때 (트레이너에게)
  bookingCancelledByCustomer: (customerName: string, scheduledAt: Date) => ({
    title: '예약이 취소되었습니다',
    message: `${customerName} 고객이 ${scheduledAt.toLocaleString('ko-KR')} 예약을 취소했습니다.`,
    type: 'booking_cancelled' as NotificationType
  }),

  // 새 예약 요청이 들어왔을 때 (트레이너에게)
  bookingPending: (customerName: string, scheduledAt: Date) => ({
    title: '새로운 예약 요청',
    message: `${customerName} 고객이 ${scheduledAt.toLocaleString('ko-KR')} 예약을 요청했습니다.`,
    type: 'booking_pending' as NotificationType
  }),

  // 트레이너가 예약 완료 처리했을 때 (고객에게)
  bookingCompleted: (trainerName: string) => ({
    title: '서비스가 완료되었습니다',
    message: `${trainerName} 트레이너와의 서비스가 완료되었습니다. 리뷰를 남겨주세요!`,
    type: 'booking_completed' as NotificationType
  }),

  // 예약 시간 1시간 전 리마인더 (양쪽 모두)
  bookingReminder: (otherName: string, scheduledAt: Date) => ({
    title: '곧 예약 시간입니다',
    message: `${otherName}님과의 예약이 1시간 후입니다. (${scheduledAt.toLocaleString('ko-KR')})`,
    type: 'system' as NotificationType
  }),

  // 추천 예약 트레이너 매칭 완료 (고객에게)
  trainerMatchedToCustomer: (trainerName: string, scheduledAt: Date) => ({
    title: '트레이너 매칭 완료',
    message: `${trainerName} 트레이너가 회원님의 예약에 배정되었습니다. 예약 일시: ${scheduledAt.toLocaleString('ko-KR')}`,
    type: 'booking_matched' as NotificationType
  }),

  // 추천 예약 매칭 (트레이너에게)
  matchedToTrainer: (customerName: string, scheduledAt: Date) => ({
    title: '새 예약 배정',
    message: `${customerName}님의 예약이 배정되었습니다. 예약 일시: ${scheduledAt.toLocaleString('ko-KR')}`,
    type: 'booking_matched' as NotificationType
  })
}
