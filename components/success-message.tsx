'use client'

import { CheckCircle, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface SuccessMessageProps {
  message: string
  description?: string
  autoClose?: boolean
  duration?: number
}

export function SuccessMessage({
  message,
  description,
  autoClose = true,
  duration = 5000
}: SuccessMessageProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setVisible(false)
        // URL에서 success 파라미터 제거
        router.replace(window.location.pathname, { scroll: false })
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [autoClose, duration, router])

  if (!visible) return null

  const handleClose = () => {
    setVisible(false)
    router.replace(window.location.pathname, { scroll: false })
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-semibold text-green-900">{message}</p>
        {description && (
          <p className="text-sm text-green-700 mt-1">{description}</p>
        )}
      </div>
      <button
        onClick={handleClose}
        className="text-green-600 hover:text-green-800 transition-colors"
        aria-label="닫기"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}
