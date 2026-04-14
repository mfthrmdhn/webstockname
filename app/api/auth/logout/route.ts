import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { logAction } from '@/lib/audit/logger'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const prisma = (await import('@/lib/db')).default
  try {
    let userId: string | null = null

    // Extract and verify access token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7) // Remove 'Bearer ' prefix
      try {
        const payload = verifyAccessToken(token)
        userId = payload.userId
      } catch {
        // Token invalid or expired, but we can still revoke the refresh token
      }
    }

    // Extract refresh token from HttpOnly cookie
    const refreshTokenCookie = request.cookies.get('refresh_token')?.value

    if (refreshTokenCookie) {
      // Hash and delete from database (revoke)
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshTokenCookie)
        .digest('hex')

      await prisma.refreshToken.deleteMany({
        where: { tokenHash }
      })
    }

    // Log LOGOUT to audit_log if we have userId
    if (userId) {
      await logAction(userId, 'LOGOUT', 'SYSTEM')
    }

    // Clear HttpOnly cookie on client
    const response = NextResponse.json({ message: 'Logged out' })
    response.cookies.delete('refresh_token')

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
