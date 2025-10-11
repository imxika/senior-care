import { SimpleLoading } from '@/components/loading/simple-loading'
import { GradientLoading } from '@/components/loading/gradient-loading'
import { MinimalLoading } from '@/components/loading/minimal-loading'
import { AnimatedLoading } from '@/components/loading/animated-loading'
import { SkeletonLoading } from '@/components/loading/skeleton-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestLoadingPage() {
  return (
    <div className="container mx-auto px-4 py-12 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">로딩 컴포넌트 테스트</h1>
        <p className="text-xl text-muted-foreground">
          5가지 로딩 스타일을 한눈에 비교하세요
        </p>
      </div>

      {/* SimpleLoading */}
      <Card>
        <CardHeader>
          <CardTitle>1. SimpleLoading</CardTitle>
          <CardDescription>
            기본 로딩 스피너 - 대부분의 페이지에서 사용 (트레이너 목록, 예약 정보 등)
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[300px] flex items-center justify-center bg-muted/30">
          <SimpleLoading message="로딩 중..." />
        </CardContent>
      </Card>

      {/* GradientLoading */}
      <Card>
        <CardHeader>
          <CardTitle>2. GradientLoading (새 디자인)</CardTitle>
          <CardDescription>
            프리미엄 그라데이션 로딩 - 애니메이션 blob 배경, 3D 스피너, 최소 표시 시간 0.8초
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          <div className="min-h-[500px]">
            <GradientLoading
              message="잠시만 기다려주세요"
              submessage="최적의 경험을 준비하고 있습니다"
              minDisplayTime={0} // 테스트용으로 0초 설정
            />
          </div>
        </CardContent>
      </Card>

      {/* MinimalLoading */}
      <Card>
        <CardHeader>
          <CardTitle>3. MinimalLoading</CardTitle>
          <CardDescription>
            미니멀 디자인 - 간결하고 우아한 스타일
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[300px] flex items-center justify-center bg-muted/30">
          <MinimalLoading message="처리 중입니다..." />
        </CardContent>
      </Card>

      {/* AnimatedLoading */}
      <Card>
        <CardHeader>
          <CardTitle>4. AnimatedLoading</CardTitle>
          <CardDescription>
            브랜드 중심 로딩 - 회전하는 아이콘 (Heart, Users, Sparkles, Award), 대시보드 추천
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[400px] flex items-center justify-center bg-muted/30">
          <AnimatedLoading
            message="건강한 삶을 준비하고 있습니다"
            submessage="최고의 트레이너와 함께하세요"
          />
        </CardContent>
      </Card>

      {/* SkeletonLoading - List */}
      <Card>
        <CardHeader>
          <CardTitle>5. SkeletonLoading - List</CardTitle>
          <CardDescription>
            스켈레톤 UI - 리스트형 (트레이너 목록, 예약 목록 등)
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-muted/30">
          <SkeletonLoading type="list" count={3} />
        </CardContent>
      </Card>

      {/* SkeletonLoading - Card */}
      <Card>
        <CardHeader>
          <CardTitle>6. SkeletonLoading - Card</CardTitle>
          <CardDescription>
            스켈레톤 UI - 카드형 (그리드 레이아웃)
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-muted/30">
          <SkeletonLoading type="card" count={4} />
        </CardContent>
      </Card>

      {/* SkeletonLoading - Detail */}
      <Card>
        <CardHeader>
          <CardTitle>7. SkeletonLoading - Detail</CardTitle>
          <CardDescription>
            스켈레톤 UI - 상세 페이지형 (프로필, 상세 정보)
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-muted/30">
          <SkeletonLoading type="detail" />
        </CardContent>
      </Card>

      {/* SkeletonLoading - Form */}
      <Card>
        <CardHeader>
          <CardTitle>8. SkeletonLoading - Form</CardTitle>
          <CardDescription>
            스켈레톤 UI - 폼형 (입력 폼, 설정 페이지)
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-muted/30">
          <SkeletonLoading type="form" />
        </CardContent>
      </Card>

      {/* 사용 가이드 */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle>💡 사용 가이드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">SimpleLoading</h4>
            <p className="text-sm text-muted-foreground">
              • 일반적인 페이지 로딩<br />
              • 빠른 응답 예상 (&lt;2초)<br />
              • 예: 트레이너 목록, 예약 정보
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">GradientLoading</h4>
            <p className="text-sm text-muted-foreground">
              • 프리미엄 경험이 필요한 페이지<br />
              • 중간 대기 시간 (2-5초)<br />
              • 예: 결제 처리, 복잡한 계산
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">MinimalLoading</h4>
            <p className="text-sm text-muted-foreground">
              • 미니멀한 디자인이 필요한 곳<br />
              • 빠른 응답 예상 (&lt;1초)<br />
              • 예: 모달, 드롭다운
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">AnimatedLoading</h4>
            <p className="text-sm text-muted-foreground">
              • 브랜드 정체성 강조<br />
              • 대시보드, 메인 페이지<br />
              • 예: 고객/트레이너 대시보드
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">SkeletonLoading</h4>
            <p className="text-sm text-muted-foreground">
              • 레이아웃 미리보기 제공<br />
              • 콘텐츠 구조가 명확한 페이지<br />
              • 예: 리스트, 카드 그리드, 상세 페이지, 폼
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 접속 정보 */}
      <div className="text-center text-sm text-muted-foreground space-y-2 pb-8">
        <p>이 페이지는 개발 환경에서만 사용하세요</p>
        <p className="font-mono">URL: /test-loading</p>
      </div>
    </div>
  )
}
