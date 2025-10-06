import { redirect } from 'next/navigation'

export default function TrainerSettingsPage() {
  // 설정 메뉴 클릭시 자동으로 프로필로 리다이렉트
  redirect('/trainer/settings/profile')
}
