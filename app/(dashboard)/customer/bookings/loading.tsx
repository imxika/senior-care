import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[400px] space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-xl text-muted-foreground">로딩 중...</p>
    </div>
  )
}
