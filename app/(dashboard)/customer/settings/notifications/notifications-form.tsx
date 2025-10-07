'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { updateNotificationSettings } from './actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface NotificationSettingsFormProps {
  initialSettings: {
    email_booking_notifications: boolean
    email_review_notifications: boolean
    email_marketing_notifications: boolean
    push_booking_notifications: boolean
    push_review_notifications: boolean
  }
}

export function NotificationSettingsForm({ initialSettings }: NotificationSettingsFormProps) {
  const router = useRouter()

  // 알림 설정 상태
  const [emailBooking, setEmailBooking] = useState(initialSettings.email_booking_notifications)
  const [emailReview, setEmailReview] = useState(initialSettings.email_review_notifications)
  const [emailMarketing, setEmailMarketing] = useState(initialSettings.email_marketing_notifications)
  const [pushBooking, setPushBooking] = useState(initialSettings.push_booking_notifications)
  const [pushReview, setPushReview] = useState(initialSettings.push_review_notifications)

  const handleUpdate = async (field: string, value: boolean) => {
    const formData = new FormData()
    formData.append('email_booking', emailBooking.toString())
    formData.append('email_review', emailReview.toString())
    formData.append('email_marketing', emailMarketing.toString())
    formData.append('push_booking', pushBooking.toString())
    formData.append('push_review', pushReview.toString())

    // 변경된 필드 업데이트
    formData.set(field, value.toString())

    const result = await updateNotificationSettings(formData)

    if (result.error) {
      toast.error('저장 실패', { description: result.error })
      // 에러 시 원래 값으로 복구
      switch(field) {
        case 'email_booking': setEmailBooking(!value); break
        case 'email_review': setEmailReview(!value); break
        case 'email_marketing': setEmailMarketing(!value); break
        case 'push_booking': setPushBooking(!value); break
        case 'push_review': setPushReview(!value); break
      }
    } else {
      toast.success('저장 완료', { description: '알림 설정이 변경되었습니다' })
      router.refresh()
    }
  }

  return (
    <div className="space-y-5 md:space-y-6">
      {/* 이메일 알림 */}
      <Card className="border-2">
        <CardHeader className="p-6">
          <CardTitle className="text-xl md:text-2xl">이메일 알림</CardTitle>
          <CardDescription className="text-base md:text-lg">
            예약, 리뷰, 마케팅 관련 이메일 알림을 관리합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="space-y-4 md:space-y-5">
            <div className="flex items-center justify-between p-5 rounded-lg border-2 bg-card">
              <div className="space-y-1 flex-1 pr-4">
                <Label htmlFor="email-booking" className="text-lg md:text-xl cursor-pointer">예약 알림</Label>
                <p className="text-base md:text-lg text-muted-foreground">
                  새로운 예약, 예약 변경, 취소 시 이메일 수신
                </p>
              </div>
              <Switch
                id="email-booking"
                checked={emailBooking}
                onCheckedChange={(checked) => {
                  setEmailBooking(checked)
                  handleUpdate('email_booking', checked)
                }}
                className="scale-125"
              />
            </div>

            <div className="flex items-center justify-between p-5 rounded-lg border-2 bg-card">
              <div className="space-y-1 flex-1 pr-4">
                <Label htmlFor="email-review" className="text-lg md:text-xl cursor-pointer">리뷰 알림</Label>
                <p className="text-base md:text-lg text-muted-foreground">
                  새로운 리뷰 작성 가능 시 이메일 수신
                </p>
              </div>
              <Switch
                id="email-review"
                checked={emailReview}
                onCheckedChange={(checked) => {
                  setEmailReview(checked)
                  handleUpdate('email_review', checked)
                }}
                className="scale-125"
              />
            </div>

            <div className="flex items-center justify-between p-5 rounded-lg border-2 bg-card">
              <div className="space-y-1 flex-1 pr-4">
                <Label htmlFor="email-marketing" className="text-lg md:text-xl cursor-pointer">마케팅 알림</Label>
                <p className="text-base md:text-lg text-muted-foreground">
                  이벤트, 프로모션 정보 이메일 수신
                </p>
              </div>
              <Switch
                id="email-marketing"
                checked={emailMarketing}
                onCheckedChange={(checked) => {
                  setEmailMarketing(checked)
                  handleUpdate('email_marketing', checked)
                }}
                className="scale-125"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 푸시 알림 */}
      <Card className="border-2">
        <CardHeader className="p-6">
          <CardTitle className="text-xl md:text-2xl">푸시 알림</CardTitle>
          <CardDescription className="text-base md:text-lg">
            예약, 리뷰 관련 푸시 알림을 관리합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="space-y-4 md:space-y-5">
            <div className="flex items-center justify-between p-5 rounded-lg border-2 bg-card">
              <div className="space-y-1 flex-1 pr-4">
                <Label htmlFor="push-booking" className="text-lg md:text-xl cursor-pointer">예약 알림</Label>
                <p className="text-base md:text-lg text-muted-foreground">
                  새로운 예약, 예약 변경, 취소 시 푸시 알림 수신
                </p>
              </div>
              <Switch
                id="push-booking"
                checked={pushBooking}
                onCheckedChange={(checked) => {
                  setPushBooking(checked)
                  handleUpdate('push_booking', checked)
                }}
                className="scale-125"
              />
            </div>

            <div className="flex items-center justify-between p-5 rounded-lg border-2 bg-card">
              <div className="space-y-1 flex-1 pr-4">
                <Label htmlFor="push-review" className="text-lg md:text-xl cursor-pointer">리뷰 알림</Label>
                <p className="text-base md:text-lg text-muted-foreground">
                  새로운 리뷰 작성 가능 시 푸시 알림 수신
                </p>
              </div>
              <Switch
                id="push-review"
                checked={pushReview}
                onCheckedChange={(checked) => {
                  setPushReview(checked)
                  handleUpdate('push_review', checked)
                }}
                className="scale-125"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
