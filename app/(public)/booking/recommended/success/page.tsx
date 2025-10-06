import { CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function RecommendedBookingSuccessPage() {
  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-800">
            추천 예약 요청이 접수되었습니다!
          </CardTitle>
          <CardDescription className="text-green-700">
            관리자가 최적의 트레이너를 매칭하고 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 다음 단계 안내 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">📋 다음 단계</h3>
            <ol className="space-y-3 list-decimal list-inside text-gray-700">
              <li className="pl-2">
                <strong>관리자 매칭</strong>
                <p className="text-sm text-gray-600 ml-6 mt-1">
                  귀하의 요구사항에 가장 적합한 트레이너를 선정합니다. (평균 1-2시간 소요)
                </p>
              </li>
              <li className="pl-2">
                <strong>매칭 완료 알림</strong>
                <p className="text-sm text-gray-600 ml-6 mt-1">
                  트레이너가 매칭되면 즉시 알림을 보내드립니다.
                </p>
              </li>
              <li className="pl-2">
                <strong>트레이너 승인</strong>
                <p className="text-sm text-gray-600 ml-6 mt-1">
                  매칭된 트레이너가 예약을 확인하고 승인합니다.
                </p>
              </li>
              <li className="pl-2">
                <strong>예약 확정</strong>
                <p className="text-sm text-gray-600 ml-6 mt-1">
                  최종 확정되면 트레이너 정보와 정확한 금액을 안내해드립니다.
                </p>
              </li>
            </ol>
          </div>

          {/* 예상 시간 안내 */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">⏰ 예상 소요 시간</h4>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>• 관리자 매칭: 1-2시간</li>
              <li>• 트레이너 응답: 2-4시간</li>
              <li>• 전체 프로세스: 평균 6시간 이내</li>
            </ul>
            <p className="text-sm text-blue-600 mt-2 font-medium">
              💡 긴급한 경우 고객센터로 연락주시면 우선 처리해드립니다.
            </p>
          </div>

          {/* 알림 설정 안내 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">🔔 알림 받기</h4>
            <p className="text-sm text-gray-600">
              매칭 진행 상황은 알림으로 안내해드립니다.
              알림 설정을 확인해주세요.
            </p>
          </div>

          {/* 액션 버튼 */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/">
                홈으로
              </Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/customer/bookings">
                내 예약 보기
              </Link>
            </Button>
          </div>

          {/* 추가 정보 */}
          <div className="text-center text-sm text-gray-500 pt-4 border-t">
            <p>예약 내역은 &quot;내 예약&quot; 페이지에서 확인하실 수 있습니다.</p>
            <p className="mt-1">문의사항이 있으시면 고객센터로 연락주세요.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
