'use client'

import { useState } from 'react'
import Image from 'next/image'

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

  return (
    <div>
      {message && (
        <div className={`mb-4 p-4 rounded ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                트레이너
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                연락처
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                경력
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trainers.map((trainer) => (
              <tr key={trainer.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {trainer.profiles.avatar_url ? (
                      <Image
                        src={trainer.profiles.avatar_url}
                        alt={trainer.profiles.full_name}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        {trainer.profiles.full_name.charAt(0)}
                      </div>
                    )}
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {trainer.profiles.full_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {trainer.bio?.substring(0, 50)}...
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{trainer.profiles.email}</div>
                  <div className="text-sm text-gray-500">{trainer.profiles.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {trainer.experience_years || 0}년
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    trainer.is_verified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {trainer.is_verified ? '승인됨' : '대기중'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-y-1">
                  {!trainer.is_verified && (
                    <button
                      onClick={() => handleApproveAndPublish(trainer.id)}
                      disabled={loading === `both-${trainer.id}`}
                      className="block w-full px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {loading === `both-${trainer.id}` ? '처리중...' : '승인 & Sanity 게시'}
                    </button>
                  )}

                  {trainer.is_verified && (
                    <>
                      <button
                        onClick={() => handlePublishToSanity(trainer.id)}
                        disabled={loading === `sanity-${trainer.id}`}
                        className="block w-full px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
                      >
                        {loading === `sanity-${trainer.id}` ? '게시중...' : 'Sanity에 게시'}
                      </button>

                      <a
                        href={`http://localhost:3333/structure/trainerProfile`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-center"
                      >
                        Sanity Studio 열기
                      </a>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {trainers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            등록된 트레이너가 없습니다
          </div>
        )}
      </div>
    </div>
  )
}
