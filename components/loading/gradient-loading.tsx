'use client'

import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'

interface GradientLoadingProps {
  message?: string
  submessage?: string
  className?: string
  minDisplayTime?: number  // 최소 표시 시간 (밀리초)
}

export function GradientLoading({
  message = '잠시만 기다려주세요',
  submessage = '최적의 경험을 준비하고 있습니다',
  className = '',
  minDisplayTime = 800  // 기본 0.8초
}: GradientLoadingProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (minDisplayTime > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, minDisplayTime)

      return () => clearTimeout(timer)
    }
  }, [minDisplayTime])

  if (!isVisible && minDisplayTime > 0) {
    return null
  }

  return (
    <div className={`flex flex-1 flex-col items-center justify-center min-h-screen relative overflow-hidden ${className}`}>
      {/* 애니메이션 배경 그라데이션 */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-pink-900" />

      {/* 움직이는 그라데이션 원들 */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300 dark:bg-purple-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-70 animate-blob" />
      <div className="absolute top-40 right-20 w-72 h-72 bg-pink-300 dark:bg-pink-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-70 animate-blob animation-delay-2000" />
      <div className="absolute bottom-20 left-40 w-72 h-72 bg-blue-300 dark:bg-blue-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-70 animate-blob animation-delay-4000" />

      {/* 컨텐츠 */}
      <div className="relative z-10 flex flex-col items-center space-y-8 animate-in fade-in zoom-in duration-700">
        {/* 3D 스피너 */}
        <div className="relative">
          {/* 외곽 펄스 링 */}
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 opacity-75 blur-lg animate-pulse" />
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-purple-300 to-pink-300 opacity-50 animate-ping" />

          {/* 메인 스피너 */}
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-2xl">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 opacity-20 animate-pulse" />
            <Loader2 className="h-14 w-14 animate-spin text-purple-600 dark:text-purple-400" strokeWidth={2.5} />
          </div>
        </div>

        {/* 메시지 */}
        <div className="text-center space-y-4 px-6 max-w-md">
          <div className="flex items-center gap-3 justify-center">
            <Sparkles className="h-6 w-6 text-purple-500 dark:text-purple-400 animate-pulse" />
            <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 dark:from-purple-400 dark:via-pink-400 dark:to-blue-400 bg-clip-text text-transparent animate-pulse">
              {message}
            </h3>
            <Sparkles className="h-6 w-6 text-pink-500 dark:text-pink-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">{submessage}</p>
        </div>

        {/* 3단계 프로그레스 바 */}
        <div className="flex gap-2">
          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse" />
          </div>
          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-500 to-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          </div>
          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>

      {/* 추가 CSS 애니메이션 */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
