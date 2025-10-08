'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * 결제 성공 페이지
 * /payments/success?paymentKey=xxx&orderId=xxx&amount=xxx
 */
export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [confirming, setConfirming] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => {
    confirmPayment();
  }, []);

  const confirmPayment = async () => {
    try {
      const paymentKey = searchParams.get('paymentKey');
      const orderId = searchParams.get('orderId');
      const amount = searchParams.get('amount');

      if (!paymentKey || !orderId || !amount) {
        throw new Error('결제 정보가 없습니다. URL 파라미터를 확인하세요.');
      }

      // 결제 승인 API 호출
      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount: parseInt(amount),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '결제 승인에 실패했습니다.');
      }

      setPaymentData(result.data);
      setConfirming(false);
    } catch (err: any) {
      console.error('Payment confirmation error:', err);
      setError(err.message);
      setConfirming(false);
    }
  };

  // 로딩 중
  if (confirming) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-6"></div>
            <h2 className="text-xl font-semibold mb-2">결제 승인 중...</h2>
            <p className="text-gray-600 text-center">
              잠시만 기다려주세요.<br />
              결제를 처리하고 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 에러 발생
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex flex-col items-center">
            <div className="text-red-500 text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold mb-2 text-red-600">결제 승인 실패</h2>
            <p className="text-gray-600 mb-6 text-center">{error}</p>
            <div className="space-y-3 w-full">
              <button
                onClick={() => router.back()}
                className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
              >
                다시 시도하기
              </button>
              <Link
                href="/"
                className="block w-full text-center bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
              >
                홈으로 가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 성공
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="flex flex-col items-center">
          {/* 성공 아이콘 */}
          <div className="text-green-500 text-6xl mb-4">✅</div>

          {/* 제목 */}
          <h2 className="text-2xl font-bold mb-2">결제가 완료되었습니다!</h2>
          <p className="text-gray-600 mb-6">예약이 확정되었습니다.</p>

          {/* 결제 정보 */}
          {paymentData && (
            <div className="w-full bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">결제 금액</span>
                <span className="font-semibold">
                  {paymentData.amount?.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">결제 방법</span>
                <span className="font-semibold">{paymentData.method}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">주문번호</span>
                <span className="font-mono text-xs">{paymentData.orderId}</span>
              </div>
              {paymentData.approvedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">승인 시각</span>
                  <span className="text-xs">
                    {new Date(paymentData.approvedAt).toLocaleString('ko-KR')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 영수증 링크 */}
          {paymentData?.receipt?.url && (
            <a
              href={paymentData.receipt.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition mb-3"
            >
              영수증 확인
            </a>
          )}

          {/* 액션 버튼 */}
          <div className="space-y-3 w-full">
            <Link
              href="/bookings"
              className="block w-full text-center bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
            >
              예약 내역 보기
            </Link>
            <Link
              href="/"
              className="block w-full text-center bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
            >
              홈으로 가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
