'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/**
 * 결제 성공 페이지
 * Toss Payments 또는 Stripe에서 결제 성공 후 리다이렉트되는 페이지
 *
 * URL 파라미터 (Toss):
 * - paymentKey: Toss 결제 키
 * - orderId: 주문 ID
 * - amount: 결제 금액
 *
 * URL 파라미터 (Stripe):
 * - session_id: Stripe Checkout Session ID
 * - orderId: 주문 ID
 * - amount: 결제 금액
 */
export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('결제를 확인하는 중입니다...');
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        // URL 파라미터 추출
        const paymentKey = searchParams.get('paymentKey');
        const sessionId = searchParams.get('session_id');
        const orderId = searchParams.get('orderId');
        const amount = searchParams.get('amount');

        // Toss 또는 Stripe 중 하나는 있어야 함
        if ((!paymentKey && !sessionId) || !orderId || !amount) {
          throw new Error('결제 정보가 올바르지 않습니다.');
        }

        let response;

        // Stripe 결제인 경우
        if (sessionId) {
          response = await fetch('/api/payments/stripe/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              orderId,
              amount: parseInt(amount),
            }),
          });
        }
        // Toss 결제인 경우
        else if (paymentKey) {
          response = await fetch('/api/payments/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentKey,
              orderId,
              amount: parseInt(amount),
            }),
          });
        }

        if (!response) {
          throw new Error('결제 정보가 올바르지 않습니다.');
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '결제 승인에 실패했습니다.');
        }

        // 성공
        setStatus('success');
        setMessage('결제가 완료되었습니다!');
        setPaymentData(data.data);

        // 3초 후 예약 목록으로 이동
        setTimeout(() => {
          router.push('/bookings');
        }, 3000);

      } catch (error: any) {
        console.error('Payment confirmation error:', error);
        setStatus('error');
        setMessage(error.message || '결제 승인 중 오류가 발생했습니다.');
      }
    };

    confirmPayment();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        {status === 'loading' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">결제 확인 중</h2>
            <p className="text-gray-600">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">결제 완료!</h2>
            <p className="text-gray-600 mb-6">{message}</p>

            {paymentData && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">결제 금액:</span>
                    <span className="font-semibold">{paymentData.amount?.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">결제 방법:</span>
                    <span className="font-semibold">{paymentData.method || '카드'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">주문번호:</span>
                    <span className="font-mono text-xs">{paymentData.orderId}</span>
                  </div>
                </div>
              </div>
            )}

            <p className="text-sm text-gray-500">3초 후 예약 목록으로 이동합니다...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">결제 승인 실패</h2>
            <p className="text-gray-600 mb-6">{message}</p>

            <div className="space-y-3">
              <button
                onClick={() => router.push('/test-payment')}
                className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
              >
                다시 시도하기
              </button>
              <button
                onClick={() => router.push('/bookings')}
                className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
              >
                예약 목록으로
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
