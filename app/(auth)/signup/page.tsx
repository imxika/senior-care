'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setMessage({
        type: 'error',
        text: '비밀번호가 일치하지 않습니다.'
      })
      setLoading(false)
      return
    }

    // 비밀번호 길이 확인
    if (password.length < 6) {
      setMessage({
        type: 'error',
        text: '비밀번호는 최소 6자 이상이어야 합니다.'
      })
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: '회원가입이 완료되었습니다! 로그인해주세요.'
      })

      // 2초 후 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-primary/5 to-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl md:text-4xl font-bold">
            회원가입
          </CardTitle>
          <CardDescription className="text-lg md:text-xl">
            시니어 재활 서비스
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-lg md:text-xl">
                이메일
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 md:h-14 text-base md:text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-lg md:text-xl">
                비밀번호
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="최소 6자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 md:h-14 text-base md:text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-lg md:text-xl">
                비밀번호 확인
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-12 md:h-14 text-base md:text-lg"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 md:h-16 text-lg md:text-xl font-bold"
              size="lg"
            >
              <UserPlus className="w-6 h-6 mr-3" />
              가입하기
            </Button>
          </form>

          {/* 메시지 표시 */}
          {message && (
            <div
              className={`p-4 rounded-lg text-base md:text-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* 로그인 링크 */}
          <div className="text-center">
            <p className="text-base md:text-lg text-muted-foreground">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="text-primary font-bold hover:underline">
                로그인
              </Link>
            </p>
          </div>

          {/* 안내 문구 */}
          <p className="text-center text-sm md:text-base text-muted-foreground">
            회원가입하면{' '}
            <a href="#" className="underline hover:text-foreground">
              서비스 이용약관
            </a>
            과{' '}
            <a href="#" className="underline hover:text-foreground">
              개인정보 처리방침
            </a>
            에 동의하는 것으로 간주됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
