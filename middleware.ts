import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes that don't require auth
  const publicRoutes = ['/', '/login', '/signup', '/trainers']
  const isPublicRoute = publicRoutes.some(route => {
    if (route === '/') {
      return request.nextUrl.pathname === '/'
    }
    return request.nextUrl.pathname.startsWith(route)
  })

  // Auth routes
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth')

  // Protected routes (정확한 매칭을 위해 '/'로 끝나거나 다음 경로가 있는지 확인)
  const isCustomerRoute = request.nextUrl.pathname.startsWith('/customer/')
  const isTrainerRoute = request.nextUrl.pathname.startsWith('/trainer/') || request.nextUrl.pathname === '/trainer'
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin/')

  // If not logged in and trying to access protected route
  if (!user && (isCustomerRoute || isTrainerRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If logged in
  if (user) {
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    // If trying to access login page while logged in, redirect based on user type
    if (request.nextUrl.pathname === '/login' && profile) {
      if (profile.user_type === 'customer') {
        return NextResponse.redirect(new URL('/customer/dashboard', request.url))
      } else if (profile.user_type === 'trainer') {
        return NextResponse.redirect(new URL('/trainer/dashboard', request.url))
      } else if (profile.user_type === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
    }

    // Protect customer routes
    if (isCustomerRoute && profile?.user_type !== 'customer') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Protect trainer routes
    if (isTrainerRoute && profile?.user_type !== 'trainer') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Protect admin routes
    if (isAdminRoute && profile?.user_type !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
