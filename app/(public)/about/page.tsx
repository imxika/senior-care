import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Heart,
  Users,
  Award,
  Shield,
  Clock,
  Home,
  CheckCircle,
  Star,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/10 to-background py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              건강한 노후를 위한
              <br />
              <span className="text-primary">시니어 재활 케어</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              전문 트레이너와 함께하는 맞춤형 재활 운동 서비스
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="h-14 text-lg">
                <Link href="/trainers">트레이너 찾기</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-14 text-lg border-2">
                <Link href="/booking/recommended">AI 추천 받기</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 서비스 특징 */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">왜 시니어 재활 케어인가요?</h2>
            <p className="text-xl text-muted-foreground">전문성과 신뢰를 바탕으로 한 프리미엄 재활 서비스</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <Card className="border-2 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <Award className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl">전문 인증 트레이너</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base text-muted-foreground leading-relaxed">
                  재활 전문 자격증을 보유한 검증된 트레이너들이 체계적인 운동 프로그램을 제공합니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900 mb-4">
                  <Sparkles className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-xl">AI 맞춤 매칭</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base text-muted-foreground leading-relaxed">
                  인공지능 기술로 회원님의 건강 상태와 요구사항에 최적화된 트레이너를 추천해드립니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900 mb-4">
                  <Home className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-xl">방문/센터 선택</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base text-muted-foreground leading-relaxed">
                  집에서 편안하게 받는 홈 케어, 또는 전문 시설을 갖춘 센터 방문 중 선택하실 수 있습니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900 mb-4">
                  <Shield className="h-7 w-7 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-xl">안전한 케어</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base text-muted-foreground leading-relaxed">
                  개인별 건강 상태를 고려한 맞춤형 운동으로 안전하고 효과적인 재활을 지원합니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900 mb-4">
                  <Clock className="h-7 w-7 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-xl">유연한 스케줄</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base text-muted-foreground leading-relaxed">
                  원하는 시간과 장소에서 트레이너와 만나 재활 운동을 진행할 수 있습니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-900 mb-4">
                  <Heart className="h-7 w-7 text-yellow-600 dark:text-yellow-400" />
                </div>
                <CardTitle className="text-xl">지속적 관리</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base text-muted-foreground leading-relaxed">
                  꾸준한 모니터링과 피드백을 통해 장기적인 건강 개선을 목표로 합니다.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 이용 프로세스 */}
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">이용 방법</h2>
            <p className="text-xl text-muted-foreground">간단한 4단계로 시작하세요</p>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-xl">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">회원가입</h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  간단한 정보 입력으로 회원가입을 완료하세요. 건강 상태와 운동 목표를 입력해주시면 더욱 정확한 매칭이 가능합니다.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-xl">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">트레이너 선택</h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  AI 추천 또는 직접 검색으로 원하는 트레이너를 선택하세요. 프로필과 후기를 확인하고 최적의 트레이너를 찾으세요.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-xl">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">예약하기</h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  원하는 날짜, 시간, 장소를 선택하여 예약을 신청하세요. 트레이너 확인 후 예약이 확정됩니다.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-xl">
                4
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">재활 운동 시작</h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  전문 트레이너와 함께 맞춤형 재활 운동을 시작하세요. 건강한 노후를 위한 첫 걸음을 내딛으세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <Card className="border-2 bg-gradient-to-br from-primary/5 to-purple-50 dark:from-primary/10 dark:to-purple-950">
            <CardContent className="p-8 md:p-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-6 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                건강한 노후, 지금 시작하세요
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                전문 트레이너가 여러분의 건강한 삶을 함께합니다
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="h-14 text-lg">
                  <Link href="/register?type=customer">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    무료 회원가입
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 text-lg border-2">
                  <Link href="/trainers">
                    <Star className="h-5 w-5 mr-2" />
                    트레이너 둘러보기
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
