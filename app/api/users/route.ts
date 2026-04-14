import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'
import { hashPassword } from '@/lib/auth/password'
import { z } from 'zod'

// Validation schemas
const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z
    .string()
    .min(12)
    .refine(
      (pwd) => /[A-Z]/.test(pwd),
      'Password must contain at least 1 uppercase letter'
    )
    .refine(
      (pwd) => /[0-9]/.test(pwd),
      'Password must contain at least 1 number'
    ),
  role: z.string().min(1)
})

const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  role: z.string().min(1).optional()
})

/**
 * POST /api/users - Create a new user (SUPERADMIN only)
 */
export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['SUPERADMIN'])(
    request as AuthenticatedRequest
  )
  if (rbacResult) return rbacResult

  try {
    const prisma = (await import('@/lib/db')).default
    const body = await request.json()

    // Validate request body
    const validation = createUserSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { username, password, role: roleName } = validation.data

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      )
    }

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { name: roleName }
    })

    if (!role) {
      return NextResponse.json(
        { error: 'Role does not exist' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Get current user ID from request
    const req = request as AuthenticatedRequest
    const createdBy = req.user?.userId

    // Create user
    const newUser = await prisma.user.create({
      data: {
        username,
        passwordHash,
        roleId: role.id,
        createdBy
      },
      include: {
        role: true
      }
    })

    // Log USER_CREATE to audit_log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'USER_CREATE',
        entityType: 'USER',
        entityId: newUser.id
      }
    })

    // Return user without password
    return NextResponse.json(
      {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role.name,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/users - List all users (SUPERADMIN only)
 * Optional filters: ?is_active=true, ?role={role_name}
 */
export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['SUPERADMIN'])(
    request as AuthenticatedRequest
  )
  if (rbacResult) return rbacResult

  try {
    const prisma = (await import('@/lib/db')).default
    const { searchParams } = new URL(request.url)
    const isActiveParam = searchParams.get('is_active')
    const roleParam = searchParams.get('role')

    // Build where clause for filters
    const where: any = {}

    if (isActiveParam !== null) {
      where.isActive = isActiveParam === 'true'
    }

    if (roleParam) {
      where.role = {
        name: roleParam
      }
    }

    // Fetch users with optional filters
    const users = await prisma.user.findMany({
      where,
      include: {
        role: true
      },
      select: {
        id: true,
        username: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            name: true
          }
        }
      }
    })

    return NextResponse.json(users, { status: 200 })
  } catch (error) {
    console.error('List users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
