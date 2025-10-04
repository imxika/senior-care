'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ExternalLink, CheckCircle2, Clock, Sparkles } from 'lucide-react'

interface Trainer {
  id: string
  profile_id: string
  bio: string | null
  specializations: string[] | null
  certifications: string[] | null
  experience_years: number | null
  rating: number | null
  total_reviews: number
  is_verified: boolean
  is_active: boolean
  home_visit_available: boolean
  center_visit_available: boolean
  service_areas: string[] | null
  created_at: string
  profiles: {
    full_name: string
    avatar_url: string | null
    email: string | null
    phone: string | null
  }
}

interface Props {
  trainers: Trainer[]
}

export default function TrainersManagementTable({ trainers }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleVerifyTrainer = async (trainerId: string) => {
    setLoading(trainerId)
    setMessage(null)

    try {
      const response = await fetch('/api/trainers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainerId, isVerified: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to verify trainer')
      }

      setMessage({ type: 'success', text: '트레이너가 승인되었습니다' })
      setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      setMessage({ type: 'error', text: '승인 중 오류가 발생했습니다' })
    } finally {
      setLoading(null)
    }
  }

  const handlePublishToSanity = async (trainerId: string) => {
    setLoading(`sanity-${trainerId}`)
    setMessage(null)

    try {
      const response = await fetch('/api/sanity/create-trainer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainerId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish to Sanity')
      }

      setMessage({
        type: 'success',
        text: `Sanity에 게시되었습니다! ID: ${data.sanityId}`,
      })

      // Sanity Studio 링크 표시
      setTimeout(() => {
        if (confirm('Sanity Studio에서 상세 정보를 추가하시겠습니까?')) {
          window.open(`http://localhost:3333/structure/trainerProfile;${data.sanityId}`, '_blank')
        }
      }, 1000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(null)
    }
  }

  const handleApproveAndPublish = async (trainerId: string) => {
    setLoading(`both-${trainerId}`)
    setMessage(null)

    try {
      // 1. 승인
      const verifyResponse = await fetch('/api/trainers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainerId, isVerified: true }),
      })

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify trainer')
      }

      // 2. Sanity 게시
      const sanityResponse = await fetch('/api/sanity/create-trainer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainerId }),
      })

      const sanityData = await sanityResponse.json()

      if (!sanityResponse.ok) {
        throw new Error(sanityData.error || 'Failed to publish to Sanity')
      }

      setMessage({
        type: 'success',
        text: '승인 및 Sanity 게시 완료!',
      })

      setTimeout(() => {
        if (confirm('Sanity Studio에서 상세 정보를 추가하시겠습니까?')) {
          window.open(`http://localhost:3333/structure/trainerProfile;${sanityData.sanityId}`, '_blank')
        } else {
          window.location.reload()
        }
      }, 1000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(null)
    }
  }

  const pendingTrainers = trainers.filter(t => !t.is_verified)
  const verifiedTrainers = trainers.filter(t => t.is_verified)

  return (
    <div className="space-y-4">
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Pending Trainers Section */}
      {pendingTrainers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <h2 className="text-lg font-semibold">승인 대기 중 ({pendingTrainers.length})</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingTrainers.map((trainer) => (
              <Card key={trainer.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={trainer.profiles.avatar_url || undefined} alt={trainer.profiles.full_name} />
                      <AvatarFallback className="text-lg font-bold">
                        {trainer.profiles.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{trainer.profiles.full_name}</h3>
                        <Badge variant="outline" className="shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          대기중
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{trainer.profiles.email}</p>
                      <p className="text-xs text-muted-foreground">{trainer.experience_years || 0}년 경력</p>
                    </div>
                  </div>

                  {trainer.bio && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {trainer.bio}
                    </p>
                  )}

                  <div className="mt-4 space-y-2">
                    <Button
                      onClick={() => handleApproveAndPublish(trainer.id)}
                      disabled={loading === `both-${trainer.id}`}
                      className="w-full"
                    >
                      {loading === `both-${trainer.id}` ? (
                        '처리중...'
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          승인 & Sanity 게시
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Verified Trainers Section */}
      {verifiedTrainers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold">승인된 트레이너 ({verifiedTrainers.length})</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {verifiedTrainers.map((trainer) => (
              <Card key={trainer.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={trainer.profiles.avatar_url || undefined} alt={trainer.profiles.full_name} />
                      <AvatarFallback className="text-lg font-bold">
                        {trainer.profiles.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{trainer.profiles.full_name}</h3>
                        <Badge variant="outline" className="shrink-0 border-green-200 text-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          승인됨
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{trainer.profiles.email}</p>
                      <p className="text-xs text-muted-foreground">{trainer.experience_years || 0}년 경력</p>
                    </div>
                  </div>

                  {trainer.bio && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {trainer.bio}
                    </p>
                  )}

                  <div className="mt-4 space-y-2">
                    <Button
                      onClick={() => handlePublishToSanity(trainer.id)}
                      disabled={loading === `sanity-${trainer.id}`}
                      variant="secondary"
                      className="w-full"
                    >
                      {loading === `sanity-${trainer.id}` ? (
                        '게시중...'
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Sanity에 게시
                        </>
                      )}
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="w-full"
                    >
                      <a
                        href={`http://localhost:3333/structure/trainerProfile`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Sanity Studio 열기
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {trainers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">등록된 트레이너가 없습니다</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
