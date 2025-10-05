'use client'

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { getCurrentUser } from "@/app/actions/auth"
import { NotificationsDropdown } from "@/components/notifications-dropdown"

export default function Header() {
  const [user, setUser] = useState<{ id: string; email: string | undefined } | null>(null)
  const [userType, setUserType] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    console.log('🔵 Header mounted - checking user...')
    checkUser()
  }, [])

  const loadUserType = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .single()

    console.log('Header - loadUserType:', { userId, profile, error })
    setUserType(profile?.user_type || null)
  }

  const checkUser = async () => {
    console.log('🟡 checkUser called - using server action')
    try {
      const { user: currentUser, userType: type } = await getCurrentUser()
      console.log('✅ Server action result:', { user: currentUser?.email, userType: type })

      if (currentUser) {
        setUser(currentUser)
        setUserType(type)
      } else {
        setUser(null)
        setUserType(null)
      }
    } catch (err) {
      console.error('❌ checkUser error:', err)
      setUser(null)
      setUserType(null)
    }
  }

  const getDashboardLink = () => {
    if (userType === 'customer') return '/customer/dashboard'
    if (userType === 'trainer') return '/trainer/dashboard'
    if (userType === 'admin') return '/admin/dashboard'
    return '/login'
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserType(null)
    window.location.href = '/'
  }

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl">
              시
            </div>
            <span className="text-xl md:text-2xl font-bold hidden sm:block">시니어 재활</span>
          </Link>

          {/* 데스크탑 네비게이션 */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/trainers" className="text-base hover:text-primary transition-colors">
              트레이너 찾기
            </Link>
            <Link href="/#pricing" className="text-base hover:text-primary transition-colors">
              가격안내
            </Link>
            <Link href="/about" className="text-base hover:text-primary transition-colors">
              서비스 소개
            </Link>
          </nav>

          {/* 우측 버튼 */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden lg:flex flex-col items-end text-sm">
                  <p className="font-medium">{user.email}</p>
                  <p className="text-muted-foreground text-xs">
                    {userType ? `${userType} 계정` : '프로필 없음'}
                  </p>
                </div>
                {/* 알림 드롭다운 */}
                <NotificationsDropdown />
                <Link href={getDashboardLink()}>
                  <Button className="h-10 md:h-12">
                    <LayoutDashboard className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    <span className="hidden sm:inline">대시보드</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="h-10 md:h-12"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  <span className="hidden sm:inline">로그아웃</span>
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block">
                  <Button variant="ghost" className="h-10 md:h-12">
                    로그인
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="h-10 md:h-12">
                    <span className="hidden sm:inline">시작하기</span>
                    <span className="sm:hidden">가입</span>
                  </Button>
                </Link>
              </>
            )}

            {/* 모바일 메뉴 버튼 */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col gap-3">
              <Link
                href="/trainers"
                className="text-lg py-2 hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                트레이너 찾기
              </Link>
              <Link
                href="/#pricing"
                className="text-lg py-2 hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                가격안내
              </Link>
              <Link
                href="/about"
                className="text-lg py-2 hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                서비스 소개
              </Link>
              {!user && (
                <Link
                  href="/login"
                  className="text-lg py-2 hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  로그인
                </Link>
              )}
              {user && (
                <button
                  className="text-lg py-2 hover:text-primary transition-colors text-left"
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                >
                  로그아웃
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
