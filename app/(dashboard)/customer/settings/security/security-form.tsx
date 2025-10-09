'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { updatePassword } from './actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface SecuritySettingsFormProps {
  currentEmail: string
}

export function SecuritySettingsForm({ currentEmail }: SecuritySettingsFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 비밀번호 표시 상태
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // 폼 상태
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 클라이언트 측 유효성 검사
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('모든 필드를 입력해주세요')
      setLoading(false)
      return
    }

    if (newPassword.length < 8) {
      setError('새 비밀번호는 최소 8자 이상이어야 합니다')
      setLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다')
      setLoading(false)
      return
    }

    if (currentPassword === newPassword) {
      setError('새 비밀번호는 현재 비밀번호와 달라야 합니다')
      setLoading(false)
      return
    }

    const formData = new FormData()
    formData.append('current_password', currentPassword)
    formData.append('new_password', newPassword)

    const result = await updatePassword(formData)

    if (result.error) {
      setError(result.error)
      toast.error('비밀번호 변경 실패', {
        description: result.error
      })
      setLoading(false)
    } else {
      toast.success('비밀번호가 성공적으로 변경되었습니다')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 이메일 정보 (읽기 전용) */}
      <Card>
        <CardHeader>
          <CardTitle>이메일</CardTitle>
          <CardDescription>
            계정에 등록된 이메일 주소입니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{currentEmail}</p>
          </div>
        </CardContent>
      </Card>

      {/* 비밀번호 변경 */}
      <Card>
        <CardHeader>
          <CardTitle>비밀번호 변경</CardTitle>
          <CardDescription>
            계정 보안을 위해 정기적으로 비밀번호를 변경하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 현재 비밀번호 */}
            <div className="space-y-2">
              <Label htmlFor="current_password">현재 비밀번호</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* 새 비밀번호 */}
            <div className="space-y-2">
              <Label htmlFor="new_password">새 비밀번호</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                최소 8자 이상
              </p>
            </div>

            {/* 비밀번호 확인 */}
            <div className="space-y-2">
              <Label htmlFor="confirm_password">새 비밀번호 확인</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div
              className="flex justify-end gap-2 sticky bottom-4 p-4 rounded-lg border shadow-lg"
              style={{
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(6px)',
                backgroundColor: 'rgba(255, 255, 255, 0.4)'
              }}
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                  setError(null)
                }}
              >
                취소
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                비밀번호 변경
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
