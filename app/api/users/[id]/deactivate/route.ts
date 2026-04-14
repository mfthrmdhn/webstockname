import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'
import { logAction } from '@/lib/audit/logger'

/**
 * POST /api/users/{id}/deactivate - Deactivate a user (SUPERADMIN only)
 * Sets is_active = false without deleting the user record (preserves audit trail)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['SUPERADMIN'])(
    request as AuthenticatedRequest
  )
  if (rbacResult) return rbacResult

  try {
    const prisma = (await import('@/lib/db')).default
    const { id } = params

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Deactivate user
    const deactivatedUser = await prisma.user.update({
      where: { id },
      data: {
        isActive: false
      },
      include: {
        role: true
      }
    })

    // Get current user ID from request
    const req = request as AuthenticatedRequest

    // Log USER_DEACTIVATE to audit_log
    await logAction(req.user!.userId, 'USER_DEACTIVATE', 'USER', id)

    return NextResponse.json(
      {
        id: deactivatedUser.id,
        username: deactivatedUser.username,
        role: deactivatedUser.role.name,
        isActive: deactivatedUser.isActive,
        message: 'User has been deactivated'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Deactivate user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
