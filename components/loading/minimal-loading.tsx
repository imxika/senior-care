interface MinimalLoadingProps {
  message?: string
  submessage?: string
  className?: string
}

export function MinimalLoading({
  message = 'Loading',
  submessage = 'Please wait...',
  className = ''
}: MinimalLoadingProps) {
  return (
    <div className={`flex flex-1 flex-col items-center justify-center min-h-[400px] ${className}`}>
      <div className="relative flex flex-col items-center space-y-8 animate-in fade-in duration-700">
        {/* 우아한 스피너 - 3개의 원이 회전 */}
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-gray-800" />
          <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-gray-100 dark:border-gray-900" />
        </div>

        {/* 우아한 타이포그래피 */}
        <div className="text-center space-y-3">
          <h3 className="text-3xl font-light tracking-wider text-foreground">
            {message}
          </h3>
          <div className="flex items-center gap-2 justify-center">
            <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
            <div className="h-1 w-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="h-1 w-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
          <p className="text-sm font-light tracking-wide text-muted-foreground uppercase">
            {submessage}
          </p>
        </div>
      </div>
    </div>
  )
}
