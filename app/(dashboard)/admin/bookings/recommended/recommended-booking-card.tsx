"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, FileText, User, Timer } from "lucide-react"
import { formatDate, formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { SERVICE_TYPE_LABELS } from "@/lib/constants"

interface RecommendedBookingCardProps {
  booking: {
    id: string
    booking_date: string
    start_time: string
    end_time: string
    service_type: string
    customer_notes?: string
    created_at: string
    customer?: {
      profiles?: {
        full_name?: string
        email?: string
        phone?: string
      }
    }
  }
}

export function RecommendedBookingCard({ booking }: RecommendedBookingCardProps) {
  // 고객 이름 추출 (디버깅)
  const profile = booking.customer?.profiles
  console.log('Customer profile:', profile)
  const customerName = profile?.full_name || profile?.email?.split('@')[0] || '고객'

  const date = new Date(booking.booking_date)
  const createdAt = new Date(booking.created_at)
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true, locale: ko })

  // 요청사항에서 주소와 전문분야 추출
  const notes = booking.customer_notes || ''
  const addressMatch = notes.match(/주소:\s*([^\n]+)/)
  const specialtyMatch = notes.match(/필요 전문분야:\s*([^\n]+)/)

  const address = addressMatch ? addressMatch[1].trim() : ''
  const specialty = specialtyMatch ? specialtyMatch[1].trim() : ''

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <User className="h-5 w-5" />
              {customerName}
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                추천 예약
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
              <Timer className="h-4 w-4" />
              <span>{timeAgo} 요청</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 예약 정보 */}
        <div className="grid gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>{formatDate(date, 'PPP', { locale: ko })}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-500" />
            <span>{booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-gray-500" />
            <span>{SERVICE_TYPE_LABELS[booking.service_type as keyof typeof SERVICE_TYPE_LABELS]}</span>
          </div>

          {address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span>{address}</span>
            </div>
          )}
        </div>

        {/* 요청 전문분야 */}
        {specialty && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900">요청 전문분야</p>
            <p className="text-sm text-blue-700 mt-1">{specialty}</p>
          </div>
        )}

        {/* 요청사항 */}
        {notes && notes.split('[요청 정보]')[0].trim() && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium">요청사항</p>
            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
              {notes.split('[요청 정보]')[0].trim()}
            </p>
          </div>
        )}

        {/* 고객 연락처 */}
        <div className="pt-3 border-t">
          <p className="text-xs text-gray-500">고객 연락처</p>
          <p className="text-sm">
            {profile?.email || '이메일 없음'}
          </p>
          {profile?.phone && (
            <p className="text-sm">
              {profile.phone}
            </p>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2 pt-2">
          <Link
            href={`/admin/bookings/recommended/${booking.id}/match`}
            className="flex-1"
          >
            <Button className="w-full" variant="default">
              트레이너 매칭
            </Button>
          </Link>
          <Link href={`/admin/bookings/${booking.id}`}>
            <Button variant="outline">
              상세 보기
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
