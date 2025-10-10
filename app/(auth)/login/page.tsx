'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MessageCircle, Chrome, LogIn, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // 이메일 + 비밀번호 로그인
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      setMessage({ type: 'success', text: '로그인 성공! 리다이렉트 중...' })

      // 완전히 새로고침하여 헤더 상태 업데이트
      setTimeout(() => {
        window.location.href = '/'
      }, 500)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Kakao 로그인
  const handleKakaoLogin = async () => {
    setIsLoading(true)
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
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '카카오 로그인 중 오류가 발생했습니다.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Google 로그인
  const handleGoogleLogin = async () => {
    setIsLoading(true)
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
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '구글 로그인 중 오류가 발생했습니다.'
      })
    } finally {
      setIsLoading(false)
    }
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
              disabled={isLoading}
              className="w-full h-14 md:h-16 text-lg md:text-xl font-bold bg-[#FEE500] hover:bg-[#FDD835] text-black"
              size="lg"
            >
              {isLoading ? (
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
              disabled={isLoading}
              variant="outline"
              className="w-full h-14 md:h-16 text-lg md:text-xl font-bold border-2"
              size="lg"
            >
              {isLoading ? (
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
              disabled={isLoading}
              className="w-full h-14 md:h-16 text-lg md:text-xl font-bold"
              size="lg"
            >
              {isLoading ? (
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
