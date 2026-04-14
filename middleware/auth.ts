import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, TokenPayload } from '@/lib/auth/jwt'

export interface AuthenticatedRequest extends NextRequest {
  user?: TokenPayload
}

/**
 * Authentication middleware that verifies JWT from Authorization header.
 * Extracts Bearer token, verifies with verifyAccessToken, and attaches user to request.
 * Returns 401 if token is missing, invalid, or expired.
 */
export async function authMiddleware(
  request: AuthenticatedRequest
): Promise<NextResponse | null> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid authorization header' },
      { status: 401 }
    )
  }

  const token = authHeader.substring(7)

  try {
    const payload = verifyAccessToken(token)
    request.user = payload
    return null // Continue to next handler
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    )
  }
}
