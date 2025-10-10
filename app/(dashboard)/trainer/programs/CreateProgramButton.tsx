'use client'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function CreateProgramButton() {
  return (
    <Button onClick={() => alert('프로그램 생성 기능은 준비 중입니다.')}>
      <Plus className="h-4 w-4 mr-2" />
      새 프로그램 만들기
    </Button>
  )
}
