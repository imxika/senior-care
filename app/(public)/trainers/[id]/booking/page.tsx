import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Star, Calendar, Clock, MapPin, Home, Building, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createBooking } from './actions'

interface PageProps {
  params: { id: string }
}

export default async function TrainerBookingPage({ params }: PageProps) {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 고객인지 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'customer') {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              예약은 고객 계정으로만 가능합니다.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 트레이너 정보 가져오기
  const { data: trainer, error } = await supabase
    .from('trainers')
    .select(`
      *,
      profiles!trainers_profile_id_fkey (
        full_name,
        avatar_url,
        email,
        phone
      )
    `)
    .eq('id', params.id)
    .eq('is_verified', true)
    .eq('is_active', true)
    .single()

  if (error || !trainer) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <Link
        href={`/trainers/${params.id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        트레이너 프로필로 돌아가기
      </Link>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left - Booking Form */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>예약 정보 입력</CardTitle>
              <CardDescription>
                필요한 정보를 입력하고 예약을 요청하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createBooking} className="space-y-6">
                {/* Hidden trainer ID */}
                <input type="hidden" name="trainer_id" value={trainer.id} />

                {/* Date & Time */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">
                      <Calendar className="h-4 w-4 inline mr-2" />
                      희망 날짜
                    </Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">
                      <Clock className="h-4 w-4 inline mr-2" />
                      희망 시간
                    </Label>
                    <Select name="time" required>
                      <SelectTrigger>
                        <SelectValue placeholder="시간 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="09:00">09:00</SelectItem>
                        <SelectItem value="10:00">10:00</SelectItem>
                        <SelectItem value="11:00">11:00</SelectItem>
                        <SelectItem value="13:00">13:00</SelectItem>
                        <SelectItem value="14:00">14:00</SelectItem>
                        <SelectItem value="15:00">15:00</SelectItem>
                        <SelectItem value="16:00">16:00</SelectItem>
                        <SelectItem value="17:00">17:00</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Service Type */}
                <div className="space-y-2">
                  <Label htmlFor="service-type">
                    <MapPin className="h-4 w-4 inline mr-2" />
                    서비스 유형
                  </Label>
                  <Select name="service_type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="서비스 유형 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {trainer.home_visit_available && (
                        <SelectItem value="home">
                          <Home className="h-4 w-4 inline mr-2" />
                          방문 서비스
                        </SelectItem>
                      )}
                      {trainer.center_visit_available && (
                        <SelectItem value="center">
                          <Building className="h-4 w-4 inline mr-2" />
                          센터 방문
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label htmlFor="duration">예상 시간</Label>
                  <Select name="duration" required>
                    <SelectTrigger>
                      <SelectValue placeholder="시간 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">1시간</SelectItem>
                      <SelectItem value="90">1시간 30분</SelectItem>
                      <SelectItem value="120">2시간</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">요청사항 (선택)</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="특별히 요청하실 사항이나 전달하고 싶은 내용을 입력해주세요"
                    rows={4}
                  />
                </div>

                {/* Submit */}
                <div className="pt-4">
                  <Button type="submit" className="w-full" size="lg">
                    예약 요청하기
                  </Button>
                  <p className="text-sm text-muted-foreground text-center mt-3">
                    예약 요청 후 트레이너가 확인하면 알림을 받게 됩니다
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right - Trainer Summary */}
        <div className="space-y-4">
          {/* Trainer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">트레이너 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={trainer.profiles?.avatar_url || undefined} alt={trainer.profiles?.full_name} />
                  <AvatarFallback className="text-xl font-bold">
                    {trainer.profiles?.full_name?.charAt(0) || 'T'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">{trainer.profiles?.full_name}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{trainer.rating?.toFixed(1) || '0.0'}</span>
                    <span className="text-sm text-muted-foreground">({trainer.total_reviews || 0})</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {trainer.experience_years || 0}년 경력
                  </p>
                </div>
              </div>

              <Separator />

              {/* Service Types */}
              <div>
                <p className="text-sm font-medium mb-2">제공 서비스</p>
                <div className="flex flex-wrap gap-2">
                  {trainer.home_visit_available && (
                    <Badge variant="secondary">
                      <Home className="h-3 w-3 mr-1" />
                      방문 서비스
                    </Badge>
                  )}
                  {trainer.center_visit_available && (
                    <Badge variant="secondary">
                      <Building className="h-3 w-3 mr-1" />
                      센터 방문
                    </Badge>
                  )}
                </div>
              </div>

              {/* Service Areas */}
              {trainer.service_areas && trainer.service_areas.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">서비스 지역</p>
                    <div className="flex flex-wrap gap-1">
                      {trainer.service_areas.map((area: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pricing */}
          {trainer.hourly_rate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">예상 비용</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {trainer.hourly_rate.toLocaleString()}원
                </div>
                <p className="text-sm text-muted-foreground mt-1">시간당 기준</p>
                <Separator className="my-3" />
                <p className="text-xs text-muted-foreground">
                  * 최종 비용은 서비스 시간과 유형에 따라 달라질 수 있습니다
                </p>
              </CardContent>
            </Card>
          )}

          {/* Notice */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-medium text-sm mb-2">예약 안내</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• 예약 확정까지 1-2일 소요될 수 있습니다</li>
                <li>• 트레이너 사정으로 예약이 거절될 수 있습니다</li>
                <li>• 예약 취소는 24시간 전까지 가능합니다</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
