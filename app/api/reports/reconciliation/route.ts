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

    const stats = await prisma.sale.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: { total: true },
    })

    const totals = { cash: 0, card: 0, transfer: 0 }
    for (const s of stats) {
      const amount = Number(s._sum.total ?? 0)
      const method = s.paymentMethod.toUpperCase()
      if (method === 'CASH') totals.cash = amount
      else if (method === 'CARD') totals.card = amount
      else if (method === 'TRANSFER') totals.transfer = amount
    }

    return NextResponse.json(
      {
        cash: totals.cash,
        card: totals.card,
        transfer: totals.transfer,
        grandTotal: totals.cash + totals.card + totals.transfer,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Reconciliation report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
