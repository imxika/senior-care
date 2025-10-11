'use client'

import { useState } from 'react'
import PaymentProviderButton from './PaymentProviderButton'
import StripePaymentForm from './StripePaymentForm'
import CancelButton from './CancelButton'

interface CheckoutContentProps {
  booking: {
    id: string
    total_price: number
  }
}

export default function CheckoutContent({ booking }: CheckoutContentProps) {
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null)

  // Stripe Client Secret을 받으면 결제 폼 표시
  const handleClientSecretReceived = (clientSecret: string) => {
    setStripeClientSecret(clientSecret)
  }

  return (
    <>
      {/* Stripe Payment Form이 활성화되면 표시 */}
      {stripeClientSecret ? (
        <StripePaymentForm
          bookingId={booking.id}
          amount={booking.total_price}
          clientSecret={stripeClientSecret}
        />
      ) : (
        /* Payment Provider Selection */
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">결제 수단 선택</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Toss Payments */}
              <PaymentProviderButton
                provider="toss"
                bookingId={booking.id}
                amount={booking.total_price}
                label="💳 Toss Payments"
                description="국내 간편 결제"
              />

              {/* Stripe */}
              <PaymentProviderButton
                provider="stripe"
                bookingId={booking.id}
                amount={booking.total_price}
                label="💵 Stripe"
                description="글로벌 결제 (개발/테스트)"
                onClientSecretReceived={handleClientSecretReceived}
              />
            </div>

            {/* Info Notice */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                ℹ️ <strong>안내:</strong> 결제는 안전하게 처리됩니다. 결제 정보는 암호화되어 저장되지 않습니다.
              </p>
            </div>

            {/* Cancel Button */}
            <div className="mt-6 flex justify-center">
              <CancelButton bookingId={booking.id} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
