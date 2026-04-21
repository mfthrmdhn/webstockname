import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['SUPERADMIN'])(
    request as AuthenticatedRequest
  )
  if (rbacResult) return rbacResult

  try {
    const prisma = (await import('@/lib/db')).default

    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        sellingPrice: true,
        cost: true,
        storeQty: true,
        warehouseQty: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(products, { status: 200 })
  } catch (error) {
    console.error('List inventory error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
