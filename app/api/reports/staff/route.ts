import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['FINANCE', 'SUPERADMIN'])(request as AuthenticatedRequest)
  if (rbacResult) return rbacResult

  try {
    const prisma = (await import('@/lib/db')).default
    const { searchParams } = new URL(request.url)
    const startStr = searchParams.get('start')
    const endStr = searchParams.get('end')

    const where: Record<string, unknown> = {}
    if (startStr && endStr) {
      where.createdAt = { gte: new Date(startStr), lte: new Date(endStr) }
    }

    // groupBy does NOT support include — two-query pattern required
    const staffStats = await prisma.sale.groupBy({
      by: ['salespersonId'],
      where,
      _sum: { total: true, itemCount: true },
      _count: { id: true },
    })

    const userIds = staffStats.map((s) => s.salespersonId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    })

    const data = staffStats.map((s) => {
      const user = users.find((u) => u.id === s.salespersonId)
      return {
        salespersonId: s.salespersonId,
        salesperson: user?.username ?? 'Unknown',
        salesCount: s._count.id,
        totalRevenue: Number(s._sum.total ?? 0),
        itemsSold: s._sum.itemCount ?? 0,
      }
    })

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error('Staff report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
