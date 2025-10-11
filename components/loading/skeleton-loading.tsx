import { Skeleton } from '@/components/ui/skeleton'

interface SkeletonLoadingProps {
  type?: 'list' | 'card' | 'detail' | 'form'
  className?: string
}

export function SkeletonLoading({ type = 'list', className = '' }: SkeletonLoadingProps) {
  if (type === 'list') {
    return (
      <div className={`space-y-4 p-6 ${className}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4 p-4 border rounded-lg">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-3 w-[150px]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'card') {
    return (
      <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 p-6 ${className}`}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="border rounded-lg p-6 space-y-4">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
    )
  }

  if (type === 'detail') {
    return (
      <div className={`max-w-4xl mx-auto p-6 space-y-6 ${className}`}>
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    )
  }

  if (type === 'form') {
    return (
      <div className={`max-w-2xl mx-auto p-6 space-y-6 ${className}`}>
        <Skeleton className="h-8 w-1/3" />
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-12 w-32" />
        </div>
      </div>
    )
  }

  return null
}
