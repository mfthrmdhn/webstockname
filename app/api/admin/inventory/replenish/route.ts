import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'
import { logAction } from '@/lib/audit/logger'
import { z } from 'zod'

const replenishSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().min(1),
  reason: z.string().min(1, 'Reason is required').max(500),
})

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

    const validation = replenishSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { productId, quantity, reason } = validation.data
    const req = request as AuthenticatedRequest

    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Get current values (before snapshot for audit)
      const product = await tx.product.findUnique({ where: { id: productId } })
      if (!product) throw new Error('PRODUCT_NOT_FOUND')

      // Step 2: Validate warehouse stock
      if (product.warehouseQty < quantity) {
        throw new Error(
          `Insufficient warehouse stock. Only ${product.warehouseQty} available.`
        )
      }

      // Step 3: Atomic update
      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          storeQty: { increment: quantity },
          warehouseQty: { decrement: quantity },
        },
      })

      return { product, updated }
    })

    // Audit log with before/after quantities
    await logAction(
      req.user!.userId,
      'INVENTORY_REPLENISH',
      'PRODUCT',
      productId,
      {
        qty_moved: quantity,
        reason,
        before: {
          storeQty: result.product.storeQty,
          warehouseQty: result.product.warehouseQty,
        },
        after: {
          storeQty: result.updated.storeQty,
          warehouseQty: result.updated.warehouseQty,
        },
      }
    )

    return NextResponse.json(
      {
        productId,
        newStoreQty: result.updated.storeQty,
        newWarehouseQty: result.updated.warehouseQty,
      },
      { status: 200 }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error'
    if (message === 'PRODUCT_NOT_FOUND') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    const isWarehouseError = message.startsWith('Insufficient warehouse stock')
    const status = isWarehouseError ? 400 : 500
    if (!isWarehouseError) console.error('Replenish error:', error)
    return NextResponse.json({ error: message }, { status })
  }
}
