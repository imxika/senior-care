'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface PaymentProviderButtonProps {
  provider: 'toss' | 'stripe'
  bookingId: string
  amount: number
  label: string
  description: string
  onClientSecretReceived?: (clientSecret: string) => void
}

export default function PaymentProviderButton({
  provider,
  bookingId,
  amount,
  label,
  description,
  onClientSecretReceived,
}: PaymentProviderButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handlePayment = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/payments/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          amount,
          paymentProvider: provider,
          orderName: `예약 결제 #${bookingId.substring(0, 8)}`,
          customerName: 'Customer', // Will be fetched from session in API
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '결제 요청 실패')
      }

      // Stripe: Payment Intent 방식 (Client Secret 전달)
      if (provider === 'stripe' && data.data?.clientSecret) {
        onClientSecretReceived?.(data.data.clientSecret)
      }
      // Toss: 기존 방식 유지
      else if (provider === 'toss' && data.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl
      } else {
        throw new Error('결제 정보를 받지 못했습니다')
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert(error instanceof Error ? error.message : '결제 요청 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handlePayment}
      disabled={isLoading}
      className="w-full p-6 border-2 border-gray-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-all duration-200 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex flex-col items-center text-center">
        <span className="text-3xl mb-2">{label.split(' ')[0]}</span>
        <span className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
          {label.split(' ').slice(1).join(' ')}
        </span>
        <span className="text-sm text-gray-500 mt-1">{description}</span>
        <span className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg group-hover:bg-blue-700">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              처리 중...
            </>
          ) : provider === 'stripe' ? (
            `${amount.toLocaleString('ko-KR')}원 카드 정보 입력`
          ) : (
            `${amount.toLocaleString('ko-KR')}원 결제하기`
          )}
        </span>
      </div>
    </button>
  )
}
