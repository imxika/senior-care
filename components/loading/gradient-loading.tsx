import { Loader2, Sparkles } from 'lucide-react'

interface GradientLoadingProps {
  message?: string
  submessage?: string
  className?: string
}

export function GradientLoading({
  message = '잠시만 기다려주세요',
  submessage = '최적의 경험을 준비하고 있습니다',
  className = ''
}: GradientLoadingProps) {
  return (
    <div className={`flex flex-1 flex-col items-center justify-center min-h-[400px] ${className}`}>
      {/* 그라데이션 배경 */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950 opacity-50" />

      {/* 컨텐츠 */}
      <div className="relative z-10 flex flex-col items-center space-y-6 animate-in fade-in duration-500">
        {/* 펄스 애니메이션 링 */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-primary/10 animate-pulse" />

          {/* 스피너 */}
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 shadow-lg">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 dark:text-purple-400" />
          </div>
        </div>

        {/* 메시지 */}
        <div className="text-center space-y-2 px-4">
          <div className="flex items-center gap-2 justify-center">
            <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
            <h3 className="text-2xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              {message}
            </h3>
            <Sparkles className="h-5 w-5 text-pink-500 animate-pulse" />
          </div>
          <p className="text-lg text-muted-foreground">{submessage}</p>
        </div>

        {/* 프로그레스 바 (무한 애니메이션) */}
        <div className="w-64 h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full animate-pulse"
               style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
        </div>
      </div>
    </div>
  )
}
