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
    const [users, saleItems] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true },
      }),
      prisma.saleItem.findMany({
        where: {
          sale: {
            salespersonId: { in: userIds },
            ...(startStr && endStr ? { createdAt: { gte: new Date(startStr), lte: new Date(endStr) } } : {}),
          },
        },
        select: { quantity: true, unitPrice: true, unitCost: true, sale: { select: { salespersonId: true } } },
      }),
    ])

    // Compute profit per salesperson from SaleItem rows
    const profitMap: Record<string, number> = {}
    for (const item of saleItems) {
      const sid = item.sale.salespersonId
      const profit = (Number(item.unitPrice) - Number(item.unitCost)) * item.quantity
      profitMap[sid] = (profitMap[sid] ?? 0) + profit
    }

    const data = staffStats.map((s) => {
      const user = users.find((u) => u.id === s.salespersonId)
      const totalRevenue = Number(s._sum.total ?? 0)
      const totalProfit = profitMap[s.salespersonId] ?? 0
      const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : null
      return {
        staffId: s.salespersonId,
        username: user?.username ?? 'Unknown',
        salesCount: s._count.id,
        totalRevenue,
        itemsSold: s._sum.itemCount ?? 0,
        totalProfit,
        averageMargin: averageMargin !== null ? Math.round(averageMargin * 100) / 100 : null,
      }
    })

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error('Staff report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
