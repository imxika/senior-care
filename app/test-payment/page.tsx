'use client';

import { useState, useEffect } from 'react';

/**
 * 결제 API 테스트 페이지
 * /test-payment
 */
export default function TestPaymentPage() {
  const [bookingId, setBookingId] = useState('');
  const [amount, setAmount] = useState('100000');
  const [paymentProvider, setPaymentProvider] = useState<'toss' | 'stripe'>('toss');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [authStatus, setAuthStatus] = useState<{
    isAuthenticated: boolean;
    user: any;
    customer: any;
    loading: boolean;
  }>({
    isAuthenticated: false,
    user: null,
    customer: null,
    loading: true,
  });

  // 페이지 로드 시 인증 상태 및 Booking 목록 가져오기
  useEffect(() => {
    checkAuthStatus();
    fetchBookings();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();

      setAuthStatus({
        isAuthenticated: data.isAuthenticated || false,
        user: data.user || null,
        customer: data.customer || null,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to check auth status:', err);
      setAuthStatus({
        isAuthenticated: false,
        user: null,
        customer: null,
        loading: false,
      });
    }
  };

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const response = await fetch('/api/bookings/list');
      const data = await response.json();

      if (data.success) {
        setBookings(data.data.payableBookings || []);
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  // Booking 선택
  const selectBooking = (booking: any) => {
    setBookingId(booking.id);
    // total_price가 0이거나 없으면 기본값 100,000원
    const price = booking.total_price && booking.total_price > 0
      ? booking.total_price
      : 100000;
    setAmount(price.toString());
  };

  // 테스트 Booking 생성
  const handleCreateTestBooking = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/bookings/create-test', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create test booking');
      }

      alert('테스트 예약이 생성되었습니다!');
      // 목록 새로고침
      fetchBookings();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Toss Payments 처리
  const handleTossPayment = async (orderId: string, amountValue: number) => {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey) {
      throw new Error('Toss Client Key가 설정되지 않았습니다.');
    }

    const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
    const tossPayments = await loadTossPayments(clientKey);

    // @ts-ignore
    const payment = tossPayments.payment({ customerKey: 'ANONYMOUS' });

    // @ts-ignore
    await payment.requestPayment({
      method: 'CARD',
      amount: { currency: 'KRW', value: amountValue },
      orderId: orderId,
      orderName: '시니어케어 트레이닝 세션',
      successUrl: `${window.location.origin}/payments/success`,
      failUrl: `${window.location.origin}/payments/fail`,
      customerEmail: authStatus.user?.email,
      customerName: authStatus.customer?.full_name || '테스트 고객',
    });
  };

  // Stripe 처리
  const handleStripePayment = async (orderId: string, amountValue: number) => {
    // Stripe Checkout Session 생성 API 호출
    const response = await fetch('/api/payments/stripe/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        amount: amountValue,
        successUrl: `${window.location.origin}/payments/success`,
        cancelUrl: `${window.location.origin}/payments/fail`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Stripe session creation failed');
    }

    // Stripe Checkout URL로 직접 리다이렉트 (최신 방식)
    if (data.data?.sessionUrl) {
      window.location.href = data.data.sessionUrl;
    } else {
      throw new Error('Session URL not found');
    }
  };

  // 1. 결제하기 (Provider별 분기)
  const handlePayment = async () => {
    if (!bookingId || !amount) {
      setError('예약을 선택하고 금액을 입력해주세요');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 1) 결제 요청 생성 (orderId 발급)
      const response = await fetch('/api/payments/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingId,
          amount: parseInt(amount),
          orderName: '시니어케어 트레이닝 세션',
          customerName: authStatus.customer?.full_name || '테스트 고객',
          paymentProvider: paymentProvider, // 선택된 결제 수단
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment request');
      }

      const { orderId, paymentProvider: selectedProvider } = data.data;

      // 2) Provider별 분기
      if (selectedProvider === 'stripe') {
        // Stripe 결제
        await handleStripePayment(orderId, parseInt(amount));
      } else {
        // Toss 결제
        await handleTossPayment(orderId, parseInt(amount));
      }

    } catch (err: any) {
      console.error('Toss Payment Error:', err);

      // 사용자가 결제를 취소한 경우 payment 상태를 cancelled로 업데이트
      if (err.code === 'USER_CANCEL' || err.message?.includes('취소')) {
        try {
          await fetch('/api/payments/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId }),
          });
        } catch (cancelErr) {
          console.error('Failed to update payment status:', cancelErr);
        }
      }

      setError(err.message || '결제 요청 중 오류가 발생했습니다.');
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

      {/* 로그인 상태 표시 */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">👤 로그인 상태</h2>
        {authStatus.loading ? (
          <p className="text-gray-500">확인 중...</p>
        ) : authStatus.isAuthenticated ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
              <span className="font-medium text-green-700">로그인됨</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>이메일:</strong> {authStatus.user?.email}</p>
              <p><strong>User ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs">{authStatus.user?.id}</code></p>
              {authStatus.customer ? (
                <>
                  <p><strong>고객명:</strong> {authStatus.customer.full_name || '미설정'}</p>
                  {authStatus.customer.guardian_name && (
                    <p><strong>보호자:</strong> {authStatus.customer.guardian_name}</p>
                  )}
                  <p><strong>Customer ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs">{authStatus.customer.id}</code></p>
                  {authStatus.customer.mobility_level && (
                    <p><strong>이동 능력:</strong> {authStatus.customer.mobility_level}</p>
                  )}
                </>
              ) : (
                <p className="text-amber-600">⚠️ 연결된 고객 정보 없음 (customers 테이블에 profile_id 매칭 필요)</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-red-500 rounded-full"></span>
              <span className="font-medium text-red-700">로그인 안됨</span>
            </div>
            <p className="text-sm text-gray-600">
              로그인하지 않으면 예약 목록이 보이지 않을 수 있습니다 (RLS 정책).
            </p>
            <a
              href="/login"
              className="inline-block mt-2 bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
            >
              로그인하러 가기
            </a>
          </div>
        )}
      </div>

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

      {/* Booking 목록 */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">📋 결제 가능한 예약 목록</h2>
          <button
            onClick={handleCreateTestBooking}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600 disabled:bg-gray-400"
          >
            {loading ? '생성 중...' : '➕ 테스트 예약 생성'}
          </button>
        </div>

        {loadingBookings ? (
          <p className="text-gray-500">불러오는 중...</p>
        ) : bookings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">결제 가능한 예약이 없습니다.</p>
            <p className="text-sm mb-4">위 "테스트 예약 생성" 버튼을 클릭하여 테스트용 예약을 만드세요.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {bookings.map((booking: any) => (
              <div
                key={booking.id}
                onClick={() => selectBooking(booking)}
                className={`border rounded p-3 cursor-pointer hover:bg-blue-50 transition ${
                  bookingId === booking.id ? 'bg-blue-100 border-blue-500' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">
                      {booking.trainer?.full_name || '트레이너'} 세션
                    </p>
                    <p className="text-sm text-gray-600">
                      {booking.booking_date} {booking.start_time} - {booking.end_time}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">
                      ID: {booking.id.substring(0, 8)}...
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${booking.total_price > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {booking.total_price > 0 ? `${booking.total_price?.toLocaleString()}원` : '금액 미설정'}
                    </p>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {booking.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
              placeholder="위 목록에서 선택하거나 직접 입력"
              className="w-full border rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              위 목록에서 예약을 클릭하면 자동으로 입력됩니다
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

          <div>
            <label className="block text-sm font-medium mb-2">
              결제 수단 선택
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentProvider"
                  value="toss"
                  checked={paymentProvider === 'toss'}
                  onChange={(e) => setPaymentProvider(e.target.value as 'toss' | 'stripe')}
                  className="w-4 h-4"
                />
                <span className="text-sm">💳 Toss Payments</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentProvider"
                  value="stripe"
                  checked={paymentProvider === 'stripe'}
                  onChange={(e) => setPaymentProvider(e.target.value as 'toss' | 'stripe')}
                  className="w-4 h-4"
                />
                <span className="text-sm">💵 Stripe</span>
              </label>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={loading || !bookingId}
            className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            {loading ? '처리 중...' : `💳 ${paymentProvider === 'toss' ? 'Toss' : 'Stripe'} 결제하기`}
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
