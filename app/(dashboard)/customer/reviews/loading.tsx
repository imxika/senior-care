import { SimpleLoading } from '@/components/loading'

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-screen">
      <SimpleLoading message="리뷰 목록을 불러오는 중..." />
    </div>
  )
}
