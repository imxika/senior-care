'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { updateNotificationSettings } from './actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface NotificationSettingsFormProps {
  initialSettings: {
    email_booking_notifications: boolean
    email_review_notifications: boolean
    email_payment_notifications: boolean
    email_marketing_notifications: boolean
    push_booking_notifications: boolean
    push_review_notifications: boolean
    push_payment_notifications: boolean
  }
}

export function NotificationSettingsForm({ initialSettings }: NotificationSettingsFormProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // 알림 설정 상태
  const [emailBooking, setEmailBooking] = useState(initialSettings.email_booking_notifications)
  const [emailReview, setEmailReview] = useState(initialSettings.email_review_notifications)
  const [emailPayment, setEmailPayment] = useState(initialSettings.email_payment_notifications)
  const [emailMarketing, setEmailMarketing] = useState(initialSettings.email_marketing_notifications)
  const [pushBooking, setPushBooking] = useState(initialSettings.push_booking_notifications)
  const [pushReview, setPushReview] = useState(initialSettings.push_review_notifications)
  const [pushPayment, setPushPayment] = useState(initialSettings.push_payment_notifications)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleUpdate = async (field: string, value: boolean) => {
    const formData = new FormData()
    formData.append('email_booking', emailBooking.toString())
    formData.append('email_review', emailReview.toString())
    formData.append('email_payment', emailPayment.toString())
    formData.append('email_marketing', emailMarketing.toString())
    formData.append('push_booking', pushBooking.toString())
    formData.append('push_review', pushReview.toString())
    formData.append('push_payment', pushPayment.toString())

    // 변경된 필드 업데이트
    formData.set(field, value.toString())

    const result = await updateNotificationSettings(formData)

    if (result.error) {
      toast.error('저장 실패', { description: result.error })
      // 에러 시 원래 값으로 복구
      switch(field) {
        case 'email_booking': setEmailBooking(!value); break
        case 'email_review': setEmailReview(!value); break
        case 'email_payment': setEmailPayment(!value); break
        case 'email_marketing': setEmailMarketing(!value); break
        case 'push_booking': setPushBooking(!value); break
        case 'push_review': setPushReview(!value); break
        case 'push_payment': setPushPayment(!value); break
      }
    } else {
      toast.success('저장 완료', { description: '알림 설정이 변경되었습니다' })
      router.refresh()
    }
  }

  if (!mounted) {
    return <div className="h-[400px]" />
  }

  return (
    <div className="space-y-6">
      {/* 이메일 알림 */}
      <div className="space-y-4">
        <div>
          <h4 className="text-base md:text-lg font-medium mb-4">이메일 알림</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 md:p-4 rounded-lg border bg-card">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="email-booking" className="text-sm md:text-base">예약 알림</Label>
                <p className="text-xs md:text-sm text-muted-foreground">
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
              />
            </div>

            <div className="flex items-center justify-between p-3 md:p-4 rounded-lg border bg-card">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="email-review" className="text-sm md:text-base">리뷰 알림</Label>
                <p className="text-xs md:text-sm text-muted-foreground">
                  새로운 리뷰 작성 시 이메일 수신
                </p>
              </div>
              <Switch
                id="email-review"
                checked={emailReview}
                onCheckedChange={(checked) => {
                  setEmailReview(checked)
                  handleUpdate('email_review', checked)
                }}
              />
            </div>

            <div className="flex items-center justify-between p-3 md:p-4 rounded-lg border bg-card">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="email-payment" className="text-sm md:text-base">결제 알림</Label>
                <p className="text-xs md:text-sm text-muted-foreground">
                  수입 정산, 지급 시 이메일 수신
                </p>
              </div>
              <Switch
                id="email-payment"
                checked={emailPayment}
                onCheckedChange={(checked) => {
                  setEmailPayment(checked)
                  handleUpdate('email_payment', checked)
                }}
              />
            </div>

            <div className="flex items-center justify-between p-3 md:p-4 rounded-lg border bg-card">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="email-marketing" className="text-sm md:text-base">마케팅 알림</Label>
                <p className="text-xs md:text-sm text-muted-foreground">
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
              />
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-border my-6" />

      {/* 푸시 알림 */}
      <div className="space-y-4">
        <div>
          <h4 className="text-base md:text-lg font-medium mb-4">푸시 알림</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 md:p-4 rounded-lg border bg-card">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="push-booking" className="text-sm md:text-base">예약 알림</Label>
                <p className="text-xs md:text-sm text-muted-foreground">
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
              />
            </div>

            <div className="flex items-center justify-between p-3 md:p-4 rounded-lg border bg-card">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="push-review" className="text-sm md:text-base">리뷰 알림</Label>
                <p className="text-xs md:text-sm text-muted-foreground">
                  새로운 리뷰 작성 시 푸시 알림 수신
                </p>
              </div>
              <Switch
                id="push-review"
                checked={pushReview}
                onCheckedChange={(checked) => {
                  setPushReview(checked)
                  handleUpdate('push_review', checked)
                }}
              />
            </div>

            <div className="flex items-center justify-between p-3 md:p-4 rounded-lg border bg-card">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="push-payment" className="text-sm md:text-base">결제 알림</Label>
                <p className="text-xs md:text-sm text-muted-foreground">
                  수입 정산, 지급 시 푸시 알림 수신
                </p>
              </div>
              <Switch
                id="push-payment"
                checked={pushPayment}
                onCheckedChange={(checked) => {
                  setPushPayment(checked)
                  handleUpdate('push_payment', checked)
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
