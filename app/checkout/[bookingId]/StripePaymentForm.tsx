'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { Loader2 } from 'lucide-react'

// Stripe Publishable Key 초기화
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface StripePaymentFormProps {
  bookingId: string
  amount: number
  onSuccess?: () => void
  onError?: (error: string) => void
}

// 복구 정보 타입
interface RecoveryInfo {
  canRetry: boolean
  suggestedAction: 'retry' | 'change_card' | 'contact_support' | 'wait'
  retryAfterSeconds?: number
  shouldContactSupport: boolean
}

function CheckoutForm({ bookingId, amount, onSuccess, onError }: StripePaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [recoveryInfo, setRecoveryInfo] = useState<RecoveryInfo | null>(null)
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null)

  // 재시도 카운트다운 타이머
  useEffect(() => {
    if (retryCountdown !== null && retryCountdown > 0) {
      const timer = setTimeout(() => {
        setRetryCountdown(retryCountdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [retryCountdown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsLoading(true)
    setErrorMessage(null)
    setRecoveryInfo(null)

    try {
      // Confirm Payment Intent (카드 Hold 실행)
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required', // 리다이렉트 안 함
      })

      if (error) {
        // Stripe 클라이언트 에러 처리
        setErrorMessage(error.message || '결제 처리 중 오류가 발생했습니다.')
        setRecoveryInfo({
          canRetry: true,
          suggestedAction: error.type === 'card_error' ? 'change_card' : 'retry',
          shouldContactSupport: false
        })
        onError?.(error.message || 'Payment failed')
        setIsLoading(false)
        return
      }

      if (paymentIntent && paymentIntent.status === 'requires_capture') {
        // 성공! Payment Intent가 Hold 상태로 변경됨
        // 서버에 승인 상태 업데이트 요청
        const response = await fetch('/api/payments/stripe/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            bookingId: bookingId,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          // 서버 에러 처리 (복구 정보 포함)
          setErrorMessage(data.userMessage || data.error || '결제 확인 처리 실패')

          if (data.canRetry !== undefined) {
            setRecoveryInfo({
              canRetry: data.canRetry,
              suggestedAction: data.suggestedAction || 'retry',
              retryAfterSeconds: data.retryAfterSeconds,
              shouldContactSupport: data.shouldContactSupport || false
            })

            // 재시도 대기 시간이 있으면 카운트다운 시작
            if (data.retryAfterSeconds) {
              setRetryCountdown(data.retryAfterSeconds)
            }
          }

          onError?.(data.userMessage || data.error)
          setIsLoading(false)
          return
        }

        // 성공 - 예약 대기 페이지로 리다이렉트
        onSuccess?.()
        window.location.href = `/customer/bookings/${bookingId}`
      } else {
        throw new Error('Payment Intent 상태가 올바르지 않습니다.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '결제 처리 중 오류가 발생했습니다.'
      setErrorMessage(message)
      setRecoveryInfo({
        canRetry: true,
        suggestedAction: 'retry',
        retryAfterSeconds: 30,
        shouldContactSupport: false
      })
      onError?.(message)
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element */}
      <div className="p-4 border border-gray-200 rounded-lg bg-white">
        <PaymentElement />
      </div>

      {/* Error Message with Recovery Info */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
          <div className="flex items-start gap-2">
            <span className="text-red-600">⚠️</span>
            <p className="text-sm text-red-600 flex-1">{errorMessage}</p>
          </div>

          {/* Recovery Actions */}
          {recoveryInfo && (
            <div className="space-y-2 pt-2 border-t border-red-200">
              {recoveryInfo.suggestedAction === 'change_card' && (
                <p className="text-sm text-red-700">
                  💡 다른 카드를 사용하거나 카드 정보를 확인해주세요.
                </p>
              )}

              {recoveryInfo.suggestedAction === 'wait' && retryCountdown !== null && retryCountdown > 0 && (
                <p className="text-sm text-red-700">
                  ⏱️ {retryCountdown}초 후에 다시 시도할 수 있습니다.
                </p>
              )}

              {recoveryInfo.shouldContactSupport && (
                <p className="text-sm text-red-700">
                  📞 문제가 지속되면 고객센터(1234-5678)로 문의해주세요.
                </p>
              )}

              {recoveryInfo.canRetry && recoveryInfo.suggestedAction === 'retry' && !retryCountdown && (
                <p className="text-sm text-green-700">
                  ✓ 다시 시도 버튼을 눌러주세요.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || isLoading || (retryCountdown !== null && retryCountdown > 0)}
        className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            처리 중...
          </>
        ) : retryCountdown !== null && retryCountdown > 0 ? (
          `${retryCountdown}초 후 다시 시도`
        ) : errorMessage && recoveryInfo?.canRetry ? (
          '다시 시도하기'
        ) : (
          `${amount.toLocaleString('ko-KR')}원 결제하기`
        )}
      </button>

      {/* 안내 메시지 */}
      <div className="text-center text-sm text-gray-500">
        <p>✓ 카드 정보는 안전하게 암호화되어 처리됩니다</p>
        <p className="mt-1">✓ 트레이너 승인 시 실제 결제가 진행됩니다</p>
        <p className="mt-1">✓ 거절 시 자동으로 취소되며 결제되지 않습니다</p>
      </div>
    </form>
  )
}

export default function StripePaymentForm(props: StripePaymentFormProps & { clientSecret: string }) {
  const { clientSecret, ...formProps } = props

  if (!clientSecret) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">결제 정보를 불러오지 못했습니다.</p>
      </div>
    )
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#2563eb',
      },
    },
  }

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">💳 카드 정보 입력</h2>
        <p className="mt-2 text-sm text-gray-600">
          트레이너 승인 시에만 결제가 진행됩니다
        </p>
      </div>

      <Elements stripe={stripePromise} options={options}>
        <CheckoutForm {...formProps} />
      </Elements>
    </div>
  )
}
