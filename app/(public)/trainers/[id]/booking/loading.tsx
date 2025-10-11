import { SimpleLoading } from '@/components/loading'

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-screen">
      <SimpleLoading message="예약 페이지를 불러오는 중..." />
    </div>
  )
}
