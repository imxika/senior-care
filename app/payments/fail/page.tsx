'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

/**
 * 결제 실패 페이지
 * /payments/fail?code=xxx&message=xxx
 */
export default function PaymentFailPage() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('code');
  const errorMessage = searchParams.get('message');
  const orderId = searchParams.get('orderId');

  // 에러 코드별 사용자 친화적 메시지
  const getUserFriendlyMessage = (code: string | null): string => {
    if (!code) return '알 수 없는 오류가 발생했습니다.';

    const errorMessages: { [key: string]: string } = {
      'INVALID_CARD_NUMBER': '유효하지 않은 카드 번호입니다.',
      'INVALID_EXPIRATION': '카드 유효기간이 잘못되었습니다.',
      'INVALID_AUTH': '카드 인증에 실패했습니다.',
      'NOT_SUPPORTED_CARD': '지원하지 않는 카드입니다.',
      'INCORRECT_BASIC_AUTH': 'API 인증에 실패했습니다.',
      'INVALID_REQUEST': '잘못된 요청입니다.',
      'NOT_FOUND_PAYMENT': '결제 정보를 찾을 수 없습니다.',
      'FORBIDDEN_REQUEST': '허용되지 않은 요청입니다.',
      'REJECT_CARD_COMPANY': '카드사에서 거부했습니다.',
      'FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING': '결제 시스템 처리 중 오류가 발생했습니다.',
      'FAILED_INTERNAL_SYSTEM_PROCESSING': '내부 시스템 오류가 발생했습니다.',
      'UNKNOWN_PAYMENT_ERROR': '알 수 없는 결제 오류가 발생했습니다.',
    };

    return errorMessages[code] || errorMessage || '결제 처리 중 오류가 발생했습니다.';
  };

  // 에러 코드별 해결 방법 안내
  const getSolution = (code: string | null): string[] => {
    if (!code) return ['고객센터에 문의해주세요.'];

    const solutions: { [key: string]: string[] } = {
      'INVALID_CARD_NUMBER': [
        '카드 번호를 다시 확인해주세요.',
        '카드 뒷면의 번호와 일치하는지 확인하세요.',
      ],
      'INVALID_EXPIRATION': [
        '카드 유효기간을 다시 확인해주세요.',
        '만료된 카드인지 확인하세요.',
      ],
      'INVALID_AUTH': [
        '비밀번호 또는 생년월일을 다시 확인해주세요.',
        '카드사에 확인 후 다시 시도해주세요.',
      ],
      'NOT_SUPPORTED_CARD': [
        '다른 카드로 결제를 시도해주세요.',
        '해외 카드는 지원되지 않을 수 있습니다.',
      ],
      'REJECT_CARD_COMPANY': [
        '카드 한도를 확인해주세요.',
        '카드사에 연락하여 거부 사유를 확인하세요.',
        '다른 결제 수단을 이용해주세요.',
      ],
      'FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING': [
        '잠시 후 다시 시도해주세요.',
        '문제가 계속되면 고객센터에 문의해주세요.',
      ],
    };

    return solutions[code] || [
      '잠시 후 다시 시도해주세요.',
      '문제가 계속되면 고객센터에 문의해주세요.',
    ];
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="flex flex-col items-center">
          {/* 실패 아이콘 */}
          <div className="text-red-500 text-6xl mb-4">❌</div>

          {/* 제목 */}
          <h2 className="text-2xl font-bold mb-2 text-red-600">결제에 실패했습니다</h2>
          <p className="text-gray-600 mb-6 text-center">
            {getUserFriendlyMessage(errorCode)}
          </p>

          {/* 에러 상세 정보 */}
          <div className="w-full bg-red-50 rounded-lg p-4 mb-6 space-y-2">
            {errorCode && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">오류 코드</span>
                <span className="font-mono text-red-600">{errorCode}</span>
              </div>
            )}
            {orderId && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">주문번호</span>
                <span className="font-mono text-xs text-gray-700">{orderId}</span>
              </div>
            )}
            {errorMessage && (
              <div className="text-sm mt-3">
                <span className="text-gray-600 block mb-1">상세 메시지</span>
                <p className="text-gray-700 bg-white p-2 rounded text-xs">
                  {errorMessage}
                </p>
              </div>
            )}
          </div>

          {/* 해결 방법 안내 */}
          <div className="w-full bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2 text-sm">💡 해결 방법</h3>
            <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
              {getSolution(errorCode).map((solution, index) => (
                <li key={index}>{solution}</li>
              ))}
            </ul>
          </div>

          {/* 액션 버튼 */}
          <div className="space-y-3 w-full">
            <button
              onClick={() => window.history.back()}
              className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-semibold"
            >
              다시 시도하기
            </button>
            <Link
              href="/bookings"
              className="block w-full text-center bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
            >
              예약 내역으로 가기
            </Link>
            <Link
              href="/"
              className="block w-full text-center text-gray-600 px-6 py-3 hover:text-gray-800 transition"
            >
              홈으로 가기
            </Link>
          </div>

          {/* 고객센터 안내 */}
          <div className="mt-6 pt-6 border-t w-full text-center">
            <p className="text-sm text-gray-600 mb-2">문제가 계속되시나요?</p>
            <Link
              href="/contact"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              고객센터 문의하기 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
