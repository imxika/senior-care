import { Loader2 } from 'lucide-react'

interface SimpleLoadingProps {
  message?: string
  className?: string
}

export function SimpleLoading({ message = '로딩 중...', className = '' }: SimpleLoadingProps) {
  return (
    <div className={`flex flex-1 flex-col items-center justify-center min-h-[400px] space-y-4 ${className}`}>
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-xl text-muted-foreground">{message}</p>
    </div>
  )
}
