import { NextRequest, NextResponse } from 'next/server'
import { comparePassword } from '@/lib/auth/password'
import {
  generateAccessToken,
  generateRefreshToken,
} from '@/lib/auth/jwt'
import { logAction } from '@/lib/audit/logger'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const prisma = (await import('@/lib/db')).default
  try {
    const { username, password } = await request.json()

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
      include: { role: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Compare password
    const passwordMatch = await comparePassword(password, user.passwordHash)
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'User account is inactive' },
        { status: 403 }
      )
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.role.name)
    const refreshTokenRaw = generateRefreshToken(user.id)
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshTokenRaw)
      .digest('hex')

    // Store refresh token hash in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt
      }
    })

    // Log LOGIN to audit_log
    await logAction(user.id, 'LOGIN', 'SYSTEM')

    // Create response with HttpOnly cookie
    const response = NextResponse.json({
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role.name
      }
    })

    response.cookies.set('refresh_token', refreshTokenRaw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
