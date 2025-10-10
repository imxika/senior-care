import { NextRequest, NextResponse } from 'next/server';

/**
 * Toss Payments API 연결 테스트
 * GET /api/payments/test
 */
export async function GET(request: NextRequest) {
  try {
    const tossSecretKey = process.env.TOSS_SECRET_KEY;

    if (!tossSecretKey) {
      return NextResponse.json(
        { error: 'TOSS_SECRET_KEY is not defined' },
        { status: 500 }
      );
    }

    // Toss Payments API 기본 연결 테스트
    // 존재하지 않는 결제 조회 시도 (연결 확인용)
    const testPaymentKey = 'test_payment_key_for_connection_check';

    const response = await fetch(
      `https://api.tosspayments.com/v1/payments/${testPaymentKey}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(tossSecretKey + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    // 404 에러가 나오면 정상 (API 연결됨)
    if (response.status === 404) {
      return NextResponse.json({
        success: true,
        message: 'Toss Payments API 연결 성공!',
        details: {
          clientKey: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.substring(0, 20) + '...',
          secretKey: tossSecretKey.substring(0, 20) + '...',
          webhookSecret: process.env.TOSS_WEBHOOK_SECRET ? '설정됨' : '미설정',
          apiResponse: {
            status: response.status,
            message: data.message || 'Payment not found (정상)',
          }
        }
      });
    }

    // 401 에러면 인증 실패 (키가 잘못됨)
    if (response.status === 401) {
      return NextResponse.json(
        {
          error: 'API 인증 실패 - Secret Key를 확인하세요',
          details: data
        },
        { status: 401 }
      );
    }

    // 기타 응답
    return NextResponse.json({
      success: false,
      message: '예상치 못한 응답',
      status: response.status,
      data
    });

  } catch (error: unknown) {
    console.error('Toss API test error:', error);
    return NextResponse.json(
      {
        error: 'API 테스트 실패',
        message: error.message
      },
      { status: 500 }
    );
  }
}
