'use client'

interface PaymentProviderButtonProps {
  provider: 'toss' | 'stripe'
  bookingId: string
  amount: number
  label: string
  description: string
}

export default function PaymentProviderButton({
  provider,
  bookingId,
  amount,
  label,
  description,
}: PaymentProviderButtonProps) {
  const handlePayment = async () => {
    try {
      const button = document.getElementById(`pay-${provider}`) as HTMLButtonElement
      if (button) {
        button.disabled = true
        button.textContent = '처리 중...'
      }

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

      // Redirect to payment page
      if (provider === 'stripe' && data.data?.sessionUrl) {
        window.location.href = data.data.sessionUrl
      } else if (provider === 'toss' && data.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl
      } else {
        throw new Error('결제 URL을 받지 못했습니다')
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert(error instanceof Error ? error.message : '결제 요청 중 오류가 발생했습니다')

      // Re-enable button
      const button = document.getElementById(`pay-${provider}`) as HTMLButtonElement
      if (button) {
        button.disabled = false
        button.textContent = label
      }
    }
  }

  return (
    <button
      id={`pay-${provider}`}
      onClick={handlePayment}
      className="w-full p-6 border-2 border-gray-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-all duration-200 text-left group"
    >
      <div className="flex flex-col items-center text-center">
        <span className="text-3xl mb-2">{label.split(' ')[0]}</span>
        <span className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
          {label.split(' ').slice(1).join(' ')}
        </span>
        <span className="text-sm text-gray-500 mt-1">{description}</span>
        <span className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg group-hover:bg-blue-700">
          {amount.toLocaleString('ko-KR')}원 결제하기
        </span>
      </div>
    </button>
  )
}
