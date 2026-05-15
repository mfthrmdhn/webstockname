import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'
import { logAction } from '@/lib/audit/logger'
import { z } from 'zod'

// Validation schema for updates
const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  role: z.string().min(1).optional()
})

/**
 * PATCH /api/users/{id} - Update user (SUPERADMIN only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['SUPERADMIN'])(
    request as AuthenticatedRequest
  )
  if (rbacResult) return rbacResult

  try {
    const prisma = (await import('@/lib/db')).default
    const { id } = await params
    const body = await request.json()

    // Validate request body
    const validation = updateUserSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { username, role: roleName } = validation.data

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If username is being updated, check for uniqueness (excluding self)
    if (username && username !== existingUser.username) {
      const duplicateUser = await prisma.user.findUnique({
        where: { username }
      })

      if (duplicateUser) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        )
      }
    }

    // If role is being updated, check if role exists
    let roleId = existingUser.roleId
    if (roleName) {
      const role = await prisma.role.findUnique({
        where: { name: roleName }
      })

      if (!role) {
        return NextResponse.json(
          { error: 'Role does not exist' },
          { status: 400 }
        )
      }

      roleId = role.id
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(username && { username }),
        ...(roleName && { roleId })
      },
      include: {
        role: true
      }
    })

    // Get current user ID from request
    const req = request as AuthenticatedRequest

    // Log USER_EDIT to audit_log
    await logAction(req.user!.userId, 'USER_EDIT', 'USER', id)

    // Return updated user without password
    return NextResponse.json(
      {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role.name,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
