'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function PaymentFailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const code = searchParams.get('code');
  const message = searchParams.get('message');
  const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">결제 실패</h2>
          <p className="text-gray-600 mb-6">
            {message || '결제 중 문제가 발생했습니다.'}
          </p>

          {code && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500">
                에러 코드: <span className="font-mono text-gray-700">{code}</span>
              </p>
            </div>
          )}

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
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    }>
      <PaymentFailContent />
    </Suspense>
  );
}
