import { Heart, Users, Sparkles, Award } from 'lucide-react'

interface AnimatedLoadingProps {
  message?: string
  submessage?: string
  className?: string
}

export function AnimatedLoading({
  message = '건강한 삶을 준비하고 있습니다',
  submessage = '최고의 트레이너와 함께하세요',
  className = ''
}: AnimatedLoadingProps) {
  return (
    <div className={`flex flex-1 flex-col items-center justify-center min-h-[400px] ${className}`}>
      <div className="relative flex flex-col items-center space-y-8 animate-in fade-in duration-500">
        {/* 아이콘 애니메이션 */}
        <div className="relative h-32 w-32">
          {/* 중앙 원 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center shadow-lg">
              <Heart className="h-10 w-10 text-red-500 animate-pulse" fill="currentColor" />
            </div>
          </div>

          {/* 회전하는 아이콘들 */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
            <Users className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-6 text-blue-500" />
            <Sparkles className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 text-purple-500" />
            <Award className="absolute bottom-0 left-1/2 -translate-x-1/2 h-6 w-6 text-yellow-500" />
          </div>
        </div>

        {/* 메시지 */}
        <div className="text-center space-y-3 px-4 max-w-md">
          <h3 className="text-2xl font-semibold text-foreground animate-pulse">
            {message}
          </h3>
          <p className="text-lg text-muted-foreground">
            {submessage}
          </p>
        </div>

        {/* 점 애니메이션 */}
        <div className="flex gap-3">
          <div className="h-3 w-3 rounded-full bg-purple-500 animate-bounce" />
          <div className="h-3 w-3 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="h-3 w-3 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  )
}
