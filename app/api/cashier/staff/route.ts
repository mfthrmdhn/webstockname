import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['CASHIER', 'SUPERADMIN'])(
    request as AuthenticatedRequest
  )
  if (rbacResult) return rbacResult

  try {
    const prisma = (await import('@/lib/db')).default

    const staff = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { name: 'CASHIER' },
      },
      select: {
        id: true,
        username: true,
      },
      orderBy: { username: 'asc' },
    })

    return NextResponse.json(staff, { status: 200 })
  } catch (error) {
    console.error('List cashier staff error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
