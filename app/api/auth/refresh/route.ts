import { NextRequest, NextResponse } from 'next/server'
import { generateAccessToken, verifyRefreshToken } from '@/lib/auth/jwt'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const prisma = (await import('@/lib/db')).default
  try {
    // Extract refresh token from HttpOnly cookie
    const refreshTokenCookie = request.cookies.get('refresh_token')?.value

    if (!refreshTokenCookie) {
      return NextResponse.json(
        { error: 'No refresh token' },
        { status: 401 }
      )
    }

    // Verify token signature
    let payload
    try {
      payload = verifyRefreshToken(refreshTokenCookie)
    } catch {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      )
    }

    // Hash received token and check if it's in database (not revoked)
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshTokenCookie)
      .digest('hex')

    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        userId: payload.userId,
        tokenHash,
        expiresAt: { gt: new Date() } // Token not expired
      }
    })

    if (!storedToken) {
      return NextResponse.json(
        { error: 'Refresh token revoked or expired' },
        { status: 401 }
      )
    }

    // Get user and their role
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: true }
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      )
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user.id, user.role.name)

    return NextResponse.json({
      accessToken: newAccessToken
    })
  } catch (error) {
    console.error('Refresh error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
