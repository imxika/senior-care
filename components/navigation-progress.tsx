'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// NProgress 설정
NProgress.configure({
  showSpinner: false, // 오른쪽 스피너 숨기기
  trickleSpeed: 200,  // 진행 속도
  minimum: 0.08,      // 최소 진행률
  easing: 'ease',     // 애니메이션 easing
  speed: 400,         // 애니메이션 속도
})

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // 페이지 변경 완료 시 프로그레스 바 완료
  useEffect(() => {
    NProgress.done()
  }, [pathname, searchParams])

  // 전역 로딩 이벤트 리스너
  useEffect(() => {
    const handleStart = () => {
      NProgress.start()
    }

    const handleComplete = () => {
      NProgress.done()
    }

    // Custom events
    window.addEventListener('navigationStart', handleStart)
    window.addEventListener('navigationComplete', handleComplete)

    return () => {
      window.removeEventListener('navigationStart', handleStart)
      window.removeEventListener('navigationComplete', handleComplete)
    }
  }, [])

  return null
}
