import { NextRequest, NextResponse } from 'next/server'
import { TokenPayload } from '@/lib/auth/jwt'

export interface AuthenticatedRequest extends NextRequest {
  user?: TokenPayload
}

/**
 * RBAC middleware factory that enforces role-based access control.
 * Higher-order function that accepts an array of allowed roles.
 * Returns middleware that checks user.role against allowedRoles.
 * Returns 401 if user not authenticated, 403 if role not in allowedRoles.
 */
export function rbacMiddleware(allowedRoles: string[]) {
  return async (
    request: AuthenticatedRequest
  ): Promise<NextResponse | null> => {
    if (!request.user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    if (!allowedRoles.includes(request.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    return null // Continue to next handler
  }
}
