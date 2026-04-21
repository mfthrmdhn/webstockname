import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Only protect /admin routes
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('access_token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      const payload = verifyAccessToken(token)

      // Check if user has SUPERADMIN role
      if (payload.role !== 'SUPERADMIN') {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Token is valid and user is SUPERADMIN, continue
      return NextResponse.next()
    } catch (error) {
      // Invalid token, redirect to login
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  if (pathname.startsWith('/cashier')) {
    const token = request.cookies.get('access_token')?.value
    if (!token) return NextResponse.redirect(new URL('/login', request.url))

    try {
      const payload = verifyAccessToken(token)
      if (!['CASHIER', 'SUPERADMIN'].includes(payload.role)) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      return NextResponse.next()
    } catch {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/cashier/:path*'],
}
