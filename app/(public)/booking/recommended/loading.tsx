import { GradientLoading } from '@/components/loading'

export default function Loading() {
  return (
    <GradientLoading
      message="잠시만 기다려주세요"
      submessage="최적의 트레이너를 찾고 있습니다"
    />
  )
}
