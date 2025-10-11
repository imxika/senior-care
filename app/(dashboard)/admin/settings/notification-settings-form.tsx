'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { updateNotificationSettings } from './actions'

interface NotificationSettings {
  recommended_booking_enabled: boolean
  direct_booking_enabled: boolean
  booking_matched_enabled: boolean
  booking_confirmed_enabled: boolean
  booking_cancelled_enabled: boolean
}

interface Props {
  currentSettings: NotificationSettings | null
}

export function NotificationSettingsForm({ currentSettings }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  // 기본값 설정
  const [settings, setSettings] = useState<NotificationSettings>({
    recommended_booking_enabled: currentSettings?.recommended_booking_enabled ?? true,
    direct_booking_enabled: currentSettings?.direct_booking_enabled ?? true,
    booking_matched_enabled: currentSettings?.booking_matched_enabled ?? true,
    booking_confirmed_enabled: currentSettings?.booking_confirmed_enabled ?? true,
    booking_cancelled_enabled: currentSettings?.booking_cancelled_enabled ?? true,
  })

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await updateNotificationSettings(settings)

      if (result.success) {
        toast.success('설정 저장 완료', {
          description: '알림 설정이 성공적으로 저장되었습니다.',
        })
      } else {
        throw new Error(result.error || '설정 저장 실패')
      }
    } catch (error) {
      toast.error('오류 발생', {
        description: error instanceof Error ? error.message : '설정 저장에 실패했습니다.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const notificationItems = [
    {
      key: 'recommended_booking_enabled' as const,
      label: '추천 예약 생성',
      description: '고객이 새로운 추천 예약을 생성할 때 알림을 받습니다',
    },
    {
      key: 'direct_booking_enabled' as const,
      label: '직접 예약 생성',
      description: '고객이 트레이너를 직접 선택하여 예약할 때 알림을 받습니다',
    },
    {
      key: 'booking_matched_enabled' as const,
      label: '예약 매칭 완료',
      description: '추천 예약에 트레이너가 매칭되었을 때 알림을 받습니다',
    },
    {
      key: 'booking_confirmed_enabled' as const,
      label: '예약 확정',
      description: '예약이 확정되었을 때 알림을 받습니다',
    },
    {
      key: 'booking_cancelled_enabled' as const,
      label: '예약 취소',
      description: '예약이 취소되었을 때 알림을 받습니다',
    },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {notificationItems.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="space-y-0.5 flex-1">
              <Label
                htmlFor={item.key}
                className="text-base font-medium cursor-pointer"
              >
                {item.label}
              </Label>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>
            <Switch
              id={item.key}
              checked={settings[item.key]}
              onCheckedChange={() => handleToggle(item.key)}
              disabled={isLoading}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button type="submit" disabled={isLoading} size="lg">
          {isLoading ? '저장 중...' : '설정 저장'}
        </Button>
      </div>
    </form>
  )
}
