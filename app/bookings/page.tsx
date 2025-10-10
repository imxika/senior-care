'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email?: string;
}

interface Customer {
  id: string;
  full_name?: string;
  guardian_name?: string;
  mobility_level?: string;
}

interface Booking {
  id: string;
  booking_date: string;
  service_type: string;
  status: string;
  created_at: string;
  total_price?: number;
  customer?: {
    profile?: {
      full_name?: string;
    };
  };
  trainer?: {
    profile?: {
      full_name?: string;
    };
  };
  payments?: Payment[];
}

interface Payment {
  id: string;
  amount: string;
  payment_status: string;
  payment_provider: string;
  payment_method?: string;
  paid_at?: string;
}

interface AuthStatus {
  isAuthenticated: boolean;
  user: User | null;
  customer: Customer | null;
}

/**
 * 예약 목록 페이지
 * /bookings
 */
export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isAuthenticated: false,
    user: null,
    customer: null,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();

      if (data.isAuthenticated) {
        setAuthStatus(data);
        fetchBookings();
      } else {
        setError('로그인이 필요합니다. /test-payment 페이지에서 로그인해주세요.');
        setLoading(false);
      }
    } catch (err: unknown) {
      console.error('Auth check error:', err);
      setError('인증 상태를 확인할 수 없습니다.');
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/bookings');
      const data = await response.json();

      if (!response.ok) {
        console.error('API Error Response:', {
          status: response.status,
          data: data,
        });

        if (response.status === 401) {
          setError('로그인이 필요합니다. /test-payment 페이지에서 로그인해주세요.');
        } else if (response.status === 404) {
          setError('고객 정보를 찾을 수 없습니다. customers 테이블에 레코드를 생성해야 합니다.');
        } else {
          const errorMsg = `[${response.status}] ${data.error || 'Failed to fetch bookings'}`;
          const details = data.details ? `\n상세: ${data.details}` : '';
          const code = data.code ? `\nCode: ${data.code}` : '';
          setError(errorMsg + details + code);
        }
        return;
      }

      setBookings(data.data || []);
    } catch (err: unknown) {
      console.error('Fetch bookings error:', err);
      setError(err instanceof Error ? err.message : '예약 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: '대기중', className: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: '확정됨', className: 'bg-green-100 text-green-800' },
      cancelled: { label: '취소됨', className: 'bg-red-100 text-red-800' },
      completed: { label: '완료됨', className: 'bg-blue-100 text-blue-800' },
    };

    const { label, className } = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${className}`}>
        {label}
      </span>
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">예약 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">오류 발생</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              {!authStatus.isAuthenticated ? (
                <button
                  onClick={() => router.push('/test-payment')}
                  className="w-full bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
                >
                  로그인하러 가기
                </button>
              ) : (
                <button
                  onClick={() => checkAuth()}
                  className="w-full bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
                >
                  다시 시도
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">내 예약</h1>
              <p className="text-gray-600">예약 내역과 결제 상태를 확인하세요</p>
            </div>
            <button
              onClick={() => router.push('/test-payment')}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
            >
              <span>➕</span>
              <span>테스트 결제</span>
            </button>
          </div>
        </div>

        {/* 예약 목록 */}
        {bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">예약 내역이 없습니다</h3>
            <p className="text-gray-600 mb-6">첫 예약을 시작해보세요</p>
            <button
              onClick={() => router.push('/test-payment')}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
            >
              예약하기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-800">
                        예약 #{booking.id.slice(0, 8)}
                      </h3>
                      {getStatusBadge(booking.status)}
                    </div>
                    <p className="text-sm text-gray-600">
                      예약일시: {formatDate(booking.booking_date)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">고객</p>
                    <p className="font-semibold">{booking.customer?.profile?.full_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">트레이너</p>
                    <p className="font-semibold">{booking.trainer?.profile?.full_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">서비스 유형</p>
                    <p className="font-semibold">
                      {booking.service_type === 'home_visit' ? '🏠 방문 서비스' : '🏢 센터 방문'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">생성일</p>
                    <p className="font-semibold">{new Date(booking.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                </div>

                {/* 결제 정보 */}
                {booking.payments && booking.payments.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">결제 정보</h4>
                    {booking.payments.map((payment: Payment) => (
                      <div key={payment.id} className="bg-gray-50 rounded-lg p-3 mb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">
                              {parseInt(payment.amount).toLocaleString()}원
                            </p>
                            <p className="text-xs text-gray-600">
                              {payment.payment_provider === 'stripe' ? '💵 Stripe' : '💳 Toss'} · {payment.payment_method || '카드'}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            payment.payment_status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : payment.payment_status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payment.payment_status === 'paid' ? '결제완료'
                              : payment.payment_status === 'failed' ? '결제실패'
                              : '대기중'}
                          </span>
                        </div>
                        {payment.paid_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            결제일: {new Date(payment.paid_at).toLocaleString('ko-KR')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 액션 버튼 */}
                <div className="flex gap-2 mt-4">
                  {booking.status === 'pending' && (
                    <button
                      onClick={() => router.push(`/test-payment?bookingId=${booking.id}`)}
                      className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition text-sm"
                    >
                      결제하기
                    </button>
                  )}
                  <button
                    onClick={() => alert(`예약 상세: ${booking.id}`)}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm"
                  >
                    상세보기
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
