'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Home as HomeIcon, MapPin, Phone, Shield, Users, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter()

  const handleTrainerClick = () => {
    console.log('트레이너 찾기 클릭!')
    router.push('/trainers')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section - 모바일/데스크탑 반응형 */}
      <section className="container mx-auto px-4 py-12 md:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm md:text-base mb-6">
            <Shield className="w-4 h-4" />
            <span>믿을 수 있는 재활 전문 플랫폼</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
            건강한 노후를 위한
            <br />
            <span className="text-primary">맞춤형 재활 케어</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            1:1 프리미엄부터 1:3 그룹까지 선택 가능한
            <br className="hidden md:block" />
            전문 재활 트레이너 프로그램
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/booking/recommended">
              <Button size="lg" className="text-lg h-14 px-8 w-full sm:w-auto">
                <Shield className="w-5 h-5 mr-2" />
                추천 예약 (기본가)
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg h-14 px-8" onClick={handleTrainerClick}>
              <Users className="w-5 h-5 mr-2" />
              트레이너 직접 선택 (+30%)
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            💡 추천 예약: 관리자가 최적의 트레이너를 매칭해드립니다 (추가 비용 없음)
          </p>
        </div>
      </section>

      {/* Service Type Selection */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">서비스 방식 선택</h2>
          <p className="text-lg text-muted-foreground">먼저 원하시는 방문 방식을 선택해주세요</p>
        </div>

        <Tabs defaultValue="home-visit" className="max-w-6xl mx-auto">
          {/* Tab Triggers - Large and Prominent */}
          <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-2 mb-12 h-20 md:h-24 p-2 bg-muted/50">
            <TabsTrigger
              value="home-visit"
              className="text-lg md:text-2xl font-bold py-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <HomeIcon className="w-6 h-6 md:w-8 md:h-8 mr-3" />
              방문 재활
            </TabsTrigger>
            <TabsTrigger
              value="center-visit"
              className="text-lg md:text-2xl font-bold py-6 data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              <MapPin className="w-6 h-6 md:w-8 md:h-8 mr-3" />
              센터 방문
            </TabsTrigger>
          </TabsList>

          {/* 방문 재활 PT */}
          <TabsContent value="home-visit" className="space-y-8">
            {/* Service Description Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <HomeIcon className="w-10 h-10 text-primary" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl md:text-3xl font-bold mb-2">방문 재활 PT</h3>
                    <p className="text-base md:text-lg text-muted-foreground">
                      전문 트레이너가 직접 방문하여 맞춤형 재활 프로그램을 제공합니다
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span>편한 시간과 장소</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span>장비 무료 대여</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span>이동 부담 제로</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <h3 className="text-2xl md:text-4xl font-bold mb-3">인원별 가격 선택</h3>
              <p className="text-base md:text-lg text-muted-foreground">함께하면 더 저렴하게!</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 1:1 */}
              <Card className="border-2 border-primary/50 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    추천
                  </span>
                </div>
                <CardHeader className="pt-8 text-center">
                  <Users className="w-12 h-12 md:w-10 md:h-10 mx-auto mb-3 text-primary" />
                  <CardTitle className="text-2xl md:text-2xl">1:1 프리미엄</CardTitle>
                  <CardDescription className="text-lg md:text-base">
                    트레이너 1명이 회원님만 집중 케어
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center py-4 bg-primary/5 rounded-lg">
                    <p className="text-4xl md:text-4xl font-bold text-primary">100,000원</p>
                    <p className="text-base md:text-sm text-muted-foreground mt-1">1회당 (1인)</p>
                  </div>
                  <ul className="space-y-2 text-base md:text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 md:w-4 md:h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>100% 맞춤형 프로그램</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 md:w-4 md:h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>집중 관리 및 빠른 회복</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter className="pt-6">
                  <Link href="/select-booking-type?session=1:1&service=home" className="w-full">
                    <Button className="w-full h-16 md:h-12 text-xl md:text-base font-bold active:scale-95 transition-transform" size="lg">선택하기</Button>
                  </Link>
                </CardFooter>
              </Card>

              {/* 1:2 */}
              <Card className="border-2 hover:border-primary transition-colors">
                <CardHeader className="text-center">
                  <UsersRound className="w-12 h-12 md:w-10 md:h-10 mx-auto mb-3 text-orange-600" />
                  <CardTitle className="text-2xl md:text-2xl">1:2 듀얼</CardTitle>
                  <CardDescription className="text-lg md:text-base">
                    부부 또는 가족과 함께
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center py-4 bg-orange-50 rounded-lg">
                    <p className="text-4xl md:text-4xl font-bold text-orange-600">75,000원</p>
                    <p className="text-base md:text-sm text-muted-foreground mt-1">1회당 (1인)</p>
                    <p className="text-sm md:text-xs text-orange-600 mt-1">총 150,000원 (2인)</p>
                  </div>
                  <ul className="space-y-2 text-base md:text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 md:w-4 md:h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <span>25% 할인 혜택</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 md:w-4 md:h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <span>가족과 함께 운동</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter className="pt-6">
                  <Link href="/select-booking-type?session=2:1&service=home" className="w-full">
                    <Button variant="outline" className="w-full h-16 md:h-12 text-xl md:text-base font-bold border-orange-600 text-orange-600 hover:bg-orange-50 active:scale-95 transition-transform" size="lg">선택하기</Button>
                  </Link>
                </CardFooter>
              </Card>

              {/* 1:3 */}
              <Card className="border-2 hover:border-primary transition-colors sm:col-span-2 lg:col-span-1">
                <CardHeader className="text-center">
                  <UsersRound className="w-12 h-12 md:w-10 md:h-10 mx-auto mb-3 text-green-600" />
                  <CardTitle className="text-2xl md:text-2xl">1:3 그룹</CardTitle>
                  <CardDescription className="text-lg md:text-base">
                    친구들과 함께 즐겁게
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center py-4 bg-green-50 rounded-lg">
                    <p className="text-4xl md:text-4xl font-bold text-green-600">55,000원</p>
                    <p className="text-base md:text-sm text-muted-foreground mt-1">1회당 (1인)</p>
                    <p className="text-sm md:text-xs text-green-600 mt-1">총 165,000원 (3인)</p>
                  </div>
                  <ul className="space-y-2 text-base md:text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 md:w-4 md:h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>45% 할인 혜택</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 md:w-4 md:h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>함께하는 즐거움</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter className="pt-6">
                  <Link href="/select-booking-type?session=3:1&service=home" className="w-full">
                    <Button variant="outline" className="w-full h-16 md:h-12 text-xl md:text-base font-bold border-green-600 text-green-600 hover:bg-green-50 active:scale-95 transition-transform" size="lg">선택하기</Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          {/* 센터 방문 PT */}
          <TabsContent value="center-visit" className="space-y-8">
            {/* Service Description Card */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-10 h-10 text-green-600" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl md:text-3xl font-bold mb-2">센터 방문 PT</h3>
                    <p className="text-base md:text-lg text-muted-foreground">
                      재활 센터에서 전문 장비를 활용한 체계적인 재활 프로그램
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>최신 재활 장비</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>쾌적한 환경</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>합리적 가격</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <h3 className="text-2xl md:text-4xl font-bold mb-3">인원별 가격 선택</h3>
              <p className="text-base md:text-lg text-muted-foreground">함께하면 더 저렴하게!</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 1:1 */}
              <Card className="border-2 border-primary/50 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-green-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    추천
                  </span>
                </div>
                <CardHeader className="pt-8 text-center">
                  <Users className="w-12 h-12 md:w-10 md:h-10 mx-auto mb-3 text-green-600" />
                  <CardTitle className="text-2xl md:text-2xl">1:1 프리미엄</CardTitle>
                  <CardDescription className="text-lg md:text-base">
                    트레이너 1명이 회원님만 집중 케어
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center py-4 bg-green-50 rounded-lg">
                    <p className="text-4xl md:text-4xl font-bold text-green-600">70,000원</p>
                    <p className="text-base md:text-sm text-muted-foreground mt-1">1회당 (1인)</p>
                  </div>
                  <ul className="space-y-2 text-base md:text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 md:w-4 md:h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>100% 맞춤형 프로그램</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 md:w-4 md:h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>집중 관리 및 빠른 회복</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter className="pt-6">
                  <Link href="/select-booking-type?session=1:1&service=center" className="w-full">
                    <Button className="w-full h-16 md:h-12 text-xl md:text-base font-bold bg-green-600 hover:bg-green-700 active:scale-95 transition-transform" size="lg">선택하기</Button>
                  </Link>
                </CardFooter>
              </Card>

              {/* 1:2 */}
              <Card className="border-2 hover:border-green-600 transition-colors">
                <CardHeader className="text-center">
                  <UsersRound className="w-12 h-12 md:w-10 md:h-10 mx-auto mb-3 text-orange-600" />
                  <CardTitle className="text-2xl md:text-2xl">1:2 듀얼</CardTitle>
                  <CardDescription className="text-lg md:text-base">
                    부부 또는 가족과 함께
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center py-4 bg-orange-50 rounded-lg">
                    <p className="text-4xl md:text-4xl font-bold text-orange-600">50,000원</p>
                    <p className="text-base md:text-sm text-muted-foreground mt-1">1회당 (1인)</p>
                    <p className="text-sm md:text-xs text-orange-600 mt-1">총 100,000원 (2인)</p>
                  </div>
                  <ul className="space-y-2 text-base md:text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 md:w-4 md:h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <span>29% 할인 혜택</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 md:w-4 md:h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <span>가족과 함께 운동</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter className="pt-6">
                  <Link href="/select-booking-type?session=2:1&service=center" className="w-full">
                    <Button variant="outline" className="w-full h-16 md:h-12 text-xl md:text-base font-bold border-orange-600 text-orange-600 hover:bg-orange-50 active:scale-95 transition-transform" size="lg">선택하기</Button>
                  </Link>
                </CardFooter>
              </Card>

              {/* 1:3 */}
              <Card className="border-2 hover:border-green-600 transition-colors sm:col-span-2 lg:col-span-1">
                <CardHeader className="text-center">
                  <UsersRound className="w-12 h-12 md:w-10 md:h-10 mx-auto mb-3 text-green-600" />
                  <CardTitle className="text-2xl md:text-2xl">1:3 그룹</CardTitle>
                  <CardDescription className="text-lg md:text-base">
                    친구들과 함께 즐겁게
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center py-4 bg-green-50 rounded-lg">
                    <p className="text-4xl md:text-4xl font-bold text-green-600">35,000원</p>
                    <p className="text-base md:text-sm text-muted-foreground mt-1">1회당 (1인)</p>
                    <p className="text-sm md:text-xs text-green-600 mt-1">총 105,000원 (3인)</p>
                  </div>
                  <ul className="space-y-2 text-base md:text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 md:w-4 md:h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>50% 할인 혜택</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 md:w-4 md:h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>함께하는 즐거움</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter className="pt-6">
                  <Link href="/select-booking-type?session=3:1&service=center" className="w-full">
                    <Button variant="outline" className="w-full h-16 md:h-12 text-xl md:text-base font-bold border-green-600 text-green-600 hover:bg-green-50 active:scale-95 transition-transform" size="lg">선택하기</Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <Card className="max-w-3xl mx-auto bg-gradient-to-r from-primary/10 to-blue-100 border-primary/20">
          <CardContent className="p-8 md:p-12 text-center">
            <h3 className="text-2xl md:text-4xl font-bold mb-4">지금 바로 시작하세요</h3>
            <p className="text-base md:text-lg text-muted-foreground mb-8">
              회원가입하고 맞춤형 재활 프로그램을 시작하세요
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="h-14 px-10 text-lg font-semibold w-full sm:w-auto">
                  회원가입 하기
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="h-14 px-10 text-lg font-semibold w-full sm:w-auto">
                  로그인
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
