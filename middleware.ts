import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production'
)

async function getRole(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return (payload as { role?: string }).role ?? null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const token = request.cookies.get('access_token')?.value

  if (pathname.startsWith('/admin')) {
    if (!token) return NextResponse.redirect(new URL('/login', request.url))
    const role = await getRole(token)
    if (role !== 'SUPERADMIN') return NextResponse.redirect(new URL('/login', request.url))
    return NextResponse.next()
  }

  if (pathname.startsWith('/cashier')) {
    if (!token) return NextResponse.redirect(new URL('/login', request.url))
    const role = await getRole(token)
    if (!role || !['CASHIER', 'SUPERADMIN'].includes(role)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  if (pathname.startsWith('/finance')) {
    if (!token) return NextResponse.redirect(new URL('/login', request.url))
    const role = await getRole(token)
    if (!role || !['FINANCE', 'SUPERADMIN'].includes(role)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/cashier/:path*', '/finance/:path*'],
}
