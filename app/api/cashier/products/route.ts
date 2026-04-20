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
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()

    const products = await prisma.product.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { equals: search } },
            ],
          }
        : undefined,
      select: {
        id: true,
        name: true,
        sku: true,
        sellingPrice: true,
        cost: true,
        storeQty: true,
        warehouseQty: true,
      },
      take: 20,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(products, { status: 200 })
  } catch (error) {
    console.error('List cashier products error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
