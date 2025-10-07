'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const loadingRef = useRef(false)

  // 페이지 변경 감지 (pathname + search params)
  useEffect(() => {
    if (loadingRef.current) {
      setProgress(100)
      setTimeout(() => {
        setLoading(false)
        loadingRef.current = false
        setProgress(0)
      }, 200)
    }
  }, [pathname, searchParams])

  // 프로그레스 바 애니메이션
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (loading && progress < 90) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev
          const increment = Math.random() * 10
          return Math.min(prev + increment, 90)
        })
      }, 300)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [loading, progress])

  // 전역 로딩 이벤트 리스너
  useEffect(() => {
    let timeout: NodeJS.Timeout

    const handleStart = () => {
      setLoading(true)
      loadingRef.current = true
      setProgress(10)

      // 3초 후에도 완료되지 않으면 강제 종료
      timeout = setTimeout(() => {
        setProgress(100)
        setTimeout(() => {
          setLoading(false)
          loadingRef.current = false
          setProgress(0)
        }, 200)
      }, 3000)
    }

    window.addEventListener('navigationStart', handleStart)

    return () => {
      window.removeEventListener('navigationStart', handleStart)
      if (timeout) clearTimeout(timeout)
    }
  }, [])

  if (!loading && progress === 0) return null

  return (
    <>
      {/* 상단 프로그레스 바 */}
      <div className="fixed top-0 left-0 right-0 z-[9999]">
        <div
          className="h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 transition-all duration-300 ease-out shadow-lg shadow-blue-500/50"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 중앙 로딩 스피너 - 제거 (화면을 막지 않도록) */}
      {/* {loading && (
        <div className="fixed inset-0 bg-background/20 backdrop-blur-[1px] flex items-center justify-center z-[9998] animate-in fade-in duration-200">
          <div className="bg-card/95 p-3 md:p-4 rounded-lg shadow-xl border flex items-center gap-2 md:gap-3 animate-in zoom-in duration-200">
            <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin text-primary" />
            <span className="text-xs md:text-sm font-medium">페이지 이동 중...</span>
          </div>
        </div>
      )} */}
    </>
  )
}
