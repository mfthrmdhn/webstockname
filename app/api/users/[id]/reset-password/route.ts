import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'
import { hashPassword } from '@/lib/auth/password'
import { logAction } from '@/lib/audit/logger'
import { z } from 'zod'

// Validation schema for password reset
const resetPasswordSchema = z.object({
  new_password: z
    .string()
    .min(12)
    .refine(
      (pwd) => /[A-Z]/.test(pwd),
      'Password must contain at least 1 uppercase letter'
    )
    .refine(
      (pwd) => /[0-9]/.test(pwd),
      'Password must contain at least 1 number'
    )
})

/**
 * POST /api/users/{id}/reset-password - Reset user password (SUPERADMIN only)
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
    const body = await request.json()

    // Validate request body
    const validation = resetPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { new_password } = validation.data

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { role: true }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Hash new password
    const passwordHash = await hashPassword(new_password)

    // Update user password
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        passwordHash
      },
      include: {
        role: true
      }
    })

    // Get current user ID from request
    const req = request as AuthenticatedRequest

    // Log USER_EDIT to audit_log
    await logAction(req.user!.userId, 'USER_EDIT', 'USER', id)

    return NextResponse.json(
      {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role.name,
        message: 'Password has been reset'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
