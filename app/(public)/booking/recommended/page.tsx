import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RecommendedBookingForm } from "./recommended-booking-form"
import Link from "next/link"

export default async function RecommendedBookingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // 트레이너 계정 체크 - 트레이너는 예약 생성 불가
  const { data: trainerCheck } = await supabase
    .from('trainers')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (trainerCheck) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>접근 제한</CardTitle>
            <CardDescription>
              트레이너 계정으로는 예약을 생성할 수 없습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                트레이너는 고객이 생성한 예약을 대시보드에서 관리할 수 있습니다.
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild variant="outline">
                <Link href="/">홈으로</Link>
              </Button>
              <Button asChild>
                <Link href="/trainer/bookings">내 예약 관리</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 고객 정보 조회
  let { data: customer } = await supabase
    .from('customers')
    .select(`
      id,
      profiles!customers_profile_id_fkey(
        full_name,
        email,
        phone
      )
    `)
    .eq('profile_id', user.id)
    .single()

  // 고객 레코드가 없으면 자동 생성
  if (!customer) {
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({ profile_id: user.id })
      .select(`
        id,
        profiles!customers_profile_id_fkey(
          full_name,
          email,
          phone
        )
      `)
      .single()

    if (customerError || !newCustomer) {
      console.error('Customer creation error:', customerError)
      return (
        <div className="container mx-auto p-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>프로필 설정이 필요합니다</CardTitle>
              <CardDescription>
                고객 프로필을 생성하는 중 문제가 발생했습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium mb-2">
                  다음 사항을 확인해주세요:
                </p>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  <li>회원가입 시 사용자 타입을 '고객(Customer)'으로 선택하셨나요?</li>
                  <li>프로필 정보가 완전히 생성되었나요?</li>
                </ul>
              </div>

              {customerError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  <strong>오류 상세:</strong> {customerError.message}
                </div>
              )}

              <div className="flex gap-3">
                <Button asChild variant="outline">
                  <Link href="/">홈으로</Link>
                </Button>
                <Button asChild>
                  <Link href="/customer/profile">프로필 설정</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    customer = newCustomer
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">추천 예약</h1>
        <p className="text-gray-600 mt-2">
          관리자가 귀하의 상황에 가장 적합한 트레이너를 매칭해드립니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>예약 정보 입력</CardTitle>
          <CardDescription>
            원하시는 서비스와 시간을 입력해주세요. 관리자가 검토 후 최적의 트레이너를 매칭해드립니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecommendedBookingForm customerId={customer.id} />
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-green-50 rounded-lg">
        <h3 className="font-semibold text-green-800 mb-2">
          추천 예약의 장점
        </h3>
        <ul className="space-y-1 text-sm text-green-700">
          <li>✓ 거리와 전문분야를 고려한 최적 매칭</li>
          <li>✓ 관리자의 전문적인 추천</li>
          <li>✓ 기본 요금 적용 (추가 비용 없음)</li>
          <li>✓ 매칭 후 트레이너 정보 확인 가능</li>
        </ul>
      </div>
    </div>
  )
}
