import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Edit, Trash2, Users, DollarSign, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import CreateProgramButton from './CreateProgramButton'

export default async function TrainerProgramsPage() {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 트레이너 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'trainer') {
    redirect('/')
  }

  // 트레이너 정보 가져오기
  const { data: trainerInfo } = await supabase
    .from('trainers')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  if (!trainerInfo) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          <Alert variant="destructive">
            <AlertDescription>트레이너 정보를 찾을 수 없습니다.</AlertDescription>
          </Alert>
        </div>
      </>
    )
  }

  // 샘플 프로그램 데이터 (나중에 DB에서 가져올 예정)
  const programs = [
    {
      id: '1',
      name: '기본 체력 강화 프로그램',
      description: '노인분들의 기본 체력 향상을 위한 맞춤형 운동 프로그램',
      duration: '60분',
      price: 80000,
      max_participants: 1,
      level: 'beginner',
      active: true,
      sessions_count: 12,
    },
    {
      id: '2',
      name: '관절 건강 케어',
      description: '관절 건강을 위한 저강도 스트레칭 및 근력 운동',
      duration: '45분',
      price: 70000,
      max_participants: 3,
      level: 'beginner',
      active: true,
      sessions_count: 8,
    },
    {
      id: '3',
      name: '균형감각 향상 그룹 클래스',
      description: '낙상 예방을 위한 균형감각 훈련 그룹 수업',
      duration: '50분',
      price: 60000,
      max_participants: 5,
      level: 'intermediate',
      active: true,
      sessions_count: 15,
    },
  ]

  // 통계 계산
  const totalPrograms = programs.length
  const activePrograms = programs.filter(p => p.active).length
  const totalSessions = programs.reduce((sum, p) => sum + p.sessions_count, 0)
  const averagePrice = Math.round(programs.reduce((sum, p) => sum + p.price, 0) / programs.length)

  // 레벨 배지
  const getLevelBadge = (level: string) => {
    const variants = {
      beginner: { label: '초급', variant: 'secondary' as const },
      intermediate: { label: '중급', variant: 'default' as const },
      advanced: { label: '고급', variant: 'outline' as const },
    }
    return variants[level as keyof typeof variants] || { label: level, variant: 'outline' as const }
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/trainer/dashboard">트레이너</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>프로그램 관리</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">프로그램 관리</h1>
            <p className="text-muted-foreground mt-1">제공하는 운동 프로그램을 관리하세요</p>
          </div>
          <CreateProgramButton />
        </div>

        {/* 통계 카드 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">전체 프로그램</p>
                  <p className="text-2xl font-bold mt-2">{totalPrograms}</p>
                </div>
                <Edit className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">활성 프로그램</p>
                  <p className="text-2xl font-bold mt-2">{activePrograms}</p>
                </div>
                <Badge variant="default" className="text-lg px-3 py-1">활성</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">총 세션</p>
                  <p className="text-2xl font-bold mt-2">{totalSessions}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">평균 가격</p>
                  <p className="text-2xl font-bold mt-2">{averagePrice.toLocaleString()}원</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 프로그램 목록 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => {
            const levelBadge = getLevelBadge(program.level)
            return (
              <Card key={program.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{program.name}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={levelBadge.variant}>{levelBadge.label}</Badge>
                        {program.active && (
                          <Badge variant="default">활성</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="mt-3">
                    {program.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">소요 시간</span>
                      <span className="font-medium">{program.duration}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">회당 가격</span>
                      <span className="font-semibold text-lg">{program.price.toLocaleString()}원</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">최대 인원</span>
                      <span className="font-medium">{program.max_participants}명</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">진행 세션</span>
                      <span className="font-medium">{program.sessions_count}회</span>
                    </div>
                    <Separator className="my-2" />
                    <Button className="w-full" variant="outline">
                      프로그램 상세보기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {programs.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Edit className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                등록된 프로그램이 없습니다
              </h3>
              <p className="text-muted-foreground mb-4">
                새로운 운동 프로그램을 만들어 고객들에게 제공하세요
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                첫 프로그램 만들기
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
