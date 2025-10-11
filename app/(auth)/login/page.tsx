'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MessageCircle, Chrome, LogIn, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { AnimatedLoading } from '@/components/loading'

// 에러 메시지 한국어 번역
function translateError(errorMessage: string): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'Email not confirmed': '이메일 인증이 완료되지 않았습니다.',
    'User not found': '존재하지 않는 사용자입니다.',
    'Invalid email': '올바른 이메일 형식이 아닙니다.',
    'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
  }

  return errorMap[errorMessage] || errorMessage
}

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  const [isKakaoLoading, setIsKakaoLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // 이메일 + 비밀번호 로그인
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsEmailLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // AnimatedLoading 표시
      setIsRedirecting(true)

      // 3초 후 리다이렉트
      setTimeout(() => {
        window.location.href = '/'
      }, 3000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.'
      setMessage({
        type: 'error',
        text: translateError(errorMessage)
      })
    } finally {
      setIsEmailLoading(false)
    }
  }

  // Kakao 로그인
  const handleKakaoLogin = async () => {
    setIsKakaoLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '카카오 로그인 중 오류가 발생했습니다.'
      setMessage({
        type: 'error',
        text: translateError(errorMessage)
      })
    } finally {
      setIsKakaoLoading(false)
    }
  }

  // Google 로그인
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '구글 로그인 중 오류가 발생했습니다.'
      setMessage({
        type: 'error',
        text: translateError(errorMessage)
      })
    } finally {
      setIsGoogleLoading(false)
    }
  }

  // 로그인 성공 후 AnimatedLoading 전체 화면 표시
  if (isRedirecting) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <AnimatedLoading
          message="로그인 성공!"
          submessage="환영합니다"
          minDisplayTime={3000}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-primary/5 to-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl md:text-4xl font-bold">
            로그인
          </CardTitle>
          <CardDescription className="text-lg md:text-xl">
            시니어 재활 서비스
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 소셜 로그인 버튼들 */}
          <div className="space-y-3">
            <Button
              onClick={handleKakaoLogin}
              disabled={isKakaoLoading}
              className="w-full h-14 md:h-16 text-lg md:text-xl font-bold bg-[#FEE500] hover:bg-[#FDD835] text-black"
              size="lg"
            >
              {isKakaoLoading ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  로그인 중...
                </>
              ) : (
                <>
                  <MessageCircle className="w-6 h-6 mr-3" />
                  카카오로 로그인
                </>
              )}
            </Button>

            <Button
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              variant="outline"
              className="w-full h-14 md:h-16 text-lg md:text-xl font-bold border-2"
              size="lg"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  로그인 중...
                </>
              ) : (
                <>
                  <Chrome className="w-6 h-6 mr-3" />
                  Google로 로그인
                </>
              )}
            </Button>
          </div>

          {/* 구분선 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-muted-foreground text-base md:text-lg">
                또는
              </span>
            </div>
          </div>

          {/* 이메일 + 비밀번호 로그인 */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 md:h-14 text-base md:text-lg"
              />
            </div>

            <Button
              type="submit"
              disabled={isEmailLoading}
              className="w-full h-14 md:h-16 text-lg md:text-xl font-bold"
              size="lg"
            >
              {isEmailLoading ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  로그인 중...
                </>
              ) : (
                <>
                  <LogIn className="w-6 h-6 mr-3" />
                  로그인
                </>
              )}
            </Button>
          </form>

          {/* 메시지 표시 */}
          {message && (
            <Alert
              variant={message.type === 'error' ? 'destructive' : 'default'}
              className={message.type === 'success' ? 'border-green-500 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-950 dark:text-green-100' : ''}
            >
              {message.type === 'error' ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              <AlertDescription className="text-base md:text-lg font-medium ml-2">
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {/* 회원가입 링크 */}
          <div className="text-center">
            <p className="text-base md:text-lg text-muted-foreground">
              계정이 없으신가요?{' '}
              <Link href="/signup" className="text-primary font-bold hover:underline">
                회원가입
              </Link>
            </p>
          </div>

          {/* 안내 문구 */}
          <p className="text-center text-sm md:text-base text-muted-foreground">
            로그인하면{' '}
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
