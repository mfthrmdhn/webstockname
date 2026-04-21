import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['SUPERADMIN'])(request as AuthenticatedRequest)
  if (rbacResult) return rbacResult

  try {
    const prisma = (await import('@/lib/db')).default
    const cashierRole = await prisma.role.findUnique({ where: { name: 'CASHIER' } })
    if (!cashierRole) return NextResponse.json({ data: [] }, { status: 200 })

    const users = await prisma.user.findMany({
      where: { roleId: cashierRole.id, isActive: true },
      select: { id: true, username: true },
      orderBy: { username: 'asc' },
    })

    return NextResponse.json({ data: users }, { status: 200 })
  } catch (error) {
    console.error('Cashiers list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
