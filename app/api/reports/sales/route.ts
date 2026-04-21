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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = 50

    const where: Record<string, unknown> = {}
    if (startStr && endStr) {
      where.createdAt = { gte: new Date(startStr), lte: new Date(endStr) }
    }

    const total = await prisma.sale.count({ where })
    const sales = await prisma.sale.findMany({
      where,
      include: {
        salesperson: { select: { username: true } },
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            unitCost: true,
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const data = sales.map((sale) => {
      const revenue = sale.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0)
      const cost    = sale.items.reduce((s, i) => s + Number(i.unitCost)  * i.quantity, 0)
      const margin  = revenue > 0 ? parseFloat(((revenue - cost) / revenue * 100).toFixed(1)) : null
      return {
        id: sale.id,
        createdAt: sale.createdAt.toISOString(),
        salesperson: sale.salesperson.username,
        products: sale.items.map((i) => i.product.name).join(', '),
        total: Number(sale.total),
        paymentMethod: sale.paymentMethod,
        marginPercent: margin,
      }
    })

    return NextResponse.json(
      { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
      { status: 200 }
    )
  } catch (error) {
    console.error('Sales report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
