import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'
import { z } from 'zod'

const cuidSchema = z.string().cuid()

const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  sku: z.string().min(3).max(50).optional(),
  sellingPrice: z.number().positive().optional(),
  cost: z.number().min(0).optional(),
  storeQty: z.number().min(0).optional(),
  warehouseQty: z.number().min(0).optional(),
  category: z.string().max(100).optional().nullable(),
  is_active: z.boolean().optional(),
})

/**
 * PATCH /api/products/[id] - Update a product (SUPERADMIN only)
 * Logs only changed fields (before/after delta) to AuditLog
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['SUPERADMIN'])(
    request as AuthenticatedRequest
  )
  if (rbacResult) return rbacResult

  const idResult = cuidSchema.safeParse(params.id)
  if (!idResult.success) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
  }
  const id = idResult.data

  try {
    const prisma = (await import('@/lib/db')).default
    const body = await request.json()

    const validation = updateProductSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      )
    }

    const updateData = validation.data

    // Remap is_active to isActive for Prisma
    const prismaData: Record<string, unknown> = { ...updateData }
    if ('is_active' in prismaData) {
      prismaData.isActive = prismaData.is_active
      delete prismaData.is_active
    }

    // Fetch current product
    const currentProduct = await prisma.product.findUnique({ where: { id } })
    if (!currentProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Validate SKU uniqueness if SKU is being changed
    if (updateData.sku && updateData.sku !== currentProduct.sku) {
      const existing = await prisma.product.findUnique({
        where: { sku: updateData.sku },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'SKU already in use' },
          { status: 400 }
        )
      }
    }

    // Build before/after delta (only changed fields)
    const before: Record<string, unknown> = {}
    const after: Record<string, unknown> = {}
    const changed: string[] = []

    for (const [key, value] of Object.entries(prismaData)) {
      const currentVal = currentProduct[key as keyof typeof currentProduct]
      // Use string comparison for Decimal fields
      const currentStr =
        currentVal !== null && currentVal !== undefined
          ? String(currentVal)
          : currentVal
      const newStr =
        value !== null && value !== undefined ? String(value) : value

      if (currentStr !== newStr) {
        changed.push(key)
        before[key] = currentVal
        after[key] = value
      }
    }

    if (changed.length === 0) {
      return NextResponse.json({ message: 'No changes' }, { status: 200 })
    }

    const req = request as AuthenticatedRequest

    // Update product and write audit log atomically in one transaction
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.product.update({
        where: { id },
        data: prismaData as Parameters<typeof tx.product.update>[0]['data'],
      })
      await tx.auditLog.create({
        data: {
          userId: req.user!.userId,
          action: 'PRODUCT_UPDATE',
          entityType: 'PRODUCT',
          entityId: id,
          metadata: { before, after, changedFields: changed },
        },
      })
      return result
    })

    return NextResponse.json(
      {
        id: updated.id,
        name: updated.name,
        sku: updated.sku,
        sellingPrice: updated.sellingPrice,
        cost: updated.cost,
        storeQty: updated.storeQty,
        warehouseQty: updated.warehouseQty,
        category: updated.category,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/products/[id] - Delete a product (SUPERADMIN only)
 * Blocks deletion if product has sales history; logs full snapshot on success
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['SUPERADMIN'])(
    request as AuthenticatedRequest
  )
  if (rbacResult) return rbacResult

  const idResult = cuidSchema.safeParse(params.id)
  if (!idResult.success) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
  }
  const id = idResult.data

  try {
    const prisma = (await import('@/lib/db')).default

    // Check product exists
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check for sales history
    const salesCount = await prisma.saleItem.count({
      where: { productId: id },
    })

    if (salesCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete product',
          reason: 'This product has sales history',
          salesCount,
          alternative: 'Use soft-delete instead (set is_active to false)',
        },
        { status: 400 }
      )
    }

    // Capture full snapshot before deletion
    const snapshot = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      sellingPrice: product.sellingPrice,
      cost: product.cost,
      storeQty: product.storeQty,
      warehouseQty: product.warehouseQty,
      isActive: product.isActive,
      createdAt: product.createdAt,
    }

    const req = request as AuthenticatedRequest

    // Delete product and write audit log atomically in one transaction
    await prisma.$transaction(async (tx) => {
      await tx.product.delete({ where: { id } })
      await tx.auditLog.create({
        data: {
          userId: req.user!.userId,
          action: 'PRODUCT_DELETE',
          entityType: 'PRODUCT',
          entityId: id,
          metadata: { before: snapshot, after: null },
        },
      })
    })

    return NextResponse.json(
      {
        message: 'Product deleted successfully',
        id: product.id,
        name: product.name,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
