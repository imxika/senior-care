'use client';

import { useState } from 'react';

/**
 * 결제 API 테스트 페이지
 * /test-payment
 */
export default function TestPaymentPage() {
  const [bookingId, setBookingId] = useState('');
  const [amount, setAmount] = useState('100000');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. 결제 요청 테스트
  const handlePaymentRequest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/payments/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingId,
          amount: parseInt(amount),
          orderName: '시니어케어 트레이닝 세션',
          customerName: '테스트 고객',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment request');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. 결제 승인 테스트 (실제로는 Toss에서 리다이렉트 후 호출)
  const handlePaymentConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      // 테스트용 - 실제로는 Toss에서 paymentKey를 받아야 함
      const testPaymentKey = 'test_payment_key_' + Date.now();
      const orderId = result?.data?.orderId;

      if (!orderId) {
        throw new Error('먼저 결제 요청을 생성하세요');
      }

      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentKey: testPaymentKey,
          orderId: orderId,
          amount: parseInt(amount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm payment');
      }

      alert('결제 승인 성공! (실제 환경에서는 Toss API가 처리합니다)');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. API 연결 테스트
  const handleTestConnection = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/payments/test');
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">💳 결제 API 테스트</h1>

      {/* API 연결 테스트 */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">1. API 연결 테스트</h2>
        <button
          onClick={handleTestConnection}
          disabled={loading}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? '테스트 중...' : 'Toss API 연결 확인'}
        </button>
      </div>

      {/* 결제 요청 테스트 */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">2. 결제 요청 테스트</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Booking ID (예약 ID)
            </label>
            <input
              type="text"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="예: 123e4567-e89b-12d3-a456-426614174000"
              className="w-full border rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              실제 존재하는 Booking ID를 입력하세요
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              결제 금액 (원)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <button
            onClick={handlePaymentRequest}
            disabled={loading || !bookingId}
            className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            {loading ? '처리 중...' : '결제 요청 생성'}
          </button>
        </div>
      </div>

      {/* 결제 승인 테스트 (개발용) */}
      {result?.data?.orderId && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">3. 결제 승인 테스트 (개발용)</h2>
          <p className="text-sm text-gray-600 mb-4">
            실제 환경에서는 Toss 결제창에서 진행됩니다. 이것은 API 테스트용입니다.
          </p>
          <button
            onClick={handlePaymentConfirm}
            disabled={loading}
            className="bg-purple-500 text-white px-6 py-2 rounded hover:bg-purple-600 disabled:bg-gray-400"
          >
            {loading ? '처리 중...' : '결제 승인 (테스트)'}
          </button>
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-red-800 font-semibold mb-2">❌ 에러 발생</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* 결과 표시 */}
      {result && (
        <div className="bg-gray-50 border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">📋 결과</h3>
          <pre className="bg-white p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* 사용 안내 */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-blue-800 font-semibold mb-3">📖 사용 방법</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
          <li>먼저 "Toss API 연결 확인"을 클릭하여 API 연결을 테스트하세요.</li>
          <li>실제 존재하는 Booking ID를 입력하세요 (DB에서 확인).</li>
          <li>"결제 요청 생성"을 클릭하여 payment 레코드를 생성하세요.</li>
          <li>실제 결제는 Toss 결제창에서 진행됩니다 (현재는 개발 단계).</li>
          <li>개발용 "결제 승인"은 API 테스트용이며, 실제로는 Toss에서 처리됩니다.</li>
        </ol>
      </div>

      {/* 실제 Toss 결제 플로우 안내 */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-yellow-800 font-semibold mb-3">⚠️ 실제 결제 플로우</h3>
        <div className="text-sm text-yellow-700 space-y-2">
          <p><strong>현재 단계:</strong> 백엔드 API 완성 ✅</p>
          <p><strong>다음 단계:</strong> 프론트엔드 결제 UI 구현</p>
          <p className="mt-4"><strong>실제 결제 흐름:</strong></p>
          <ol className="list-decimal list-inside ml-4 space-y-1">
            <li>고객이 예약 페이지에서 "결제하기" 클릭</li>
            <li>POST /api/payments/request → orderId 발급</li>
            <li>Toss 결제창 오픈 (카드 정보 입력)</li>
            <li>Toss 서버에서 결제 처리</li>
            <li>성공 시: successUrl로 리다이렉트</li>
            <li>POST /api/payments/confirm → DB 업데이트</li>
            <li>예약 확정 완료</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
