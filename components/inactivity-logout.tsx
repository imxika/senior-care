'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const INACTIVITY_TIMEOUT = 30 * 60 * 1000

export function InactivityLogout() {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      logout()
    }, INACTIVITY_TIMEOUT)
  }

  useEffect(() => {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ]

    resetTimer()

    events.forEach((event) => {
      document.addEventListener(event, resetTimer)
    })

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer)
      })
    }
  }, [])

  return null
}
