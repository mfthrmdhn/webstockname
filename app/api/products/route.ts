import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'
import { logAction } from '@/lib/audit/logger'
import { z } from 'zod'

// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z.string().min(3).max(50),
  category: z.string().min(1).max(100).optional(),
  sellingPrice: z.number().positive('Selling price must be positive'),
  cost: z.number().min(0, 'Cost must be non-negative'),
})

/**
 * POST /api/products - Create a new product (SUPERADMIN only)
 */
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

    // Validate request body
    const validation = createProductSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { name, sku, category, sellingPrice, cost } = validation.data

    // Check if SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku }
    })

    if (existingProduct) {
      return NextResponse.json(
        { error: 'SKU already exists' },
        { status: 400 }
      )
    }

    // Get current user ID from request
    const req = request as AuthenticatedRequest

    // Create product
    const newProduct = await prisma.product.create({
      data: {
        name,
        sku,
        category: category || null,
        sellingPrice,
        cost,
        updatedBy: req.user?.userId
      }
    })

    // Log PRODUCT_CREATE to audit_log
    await logAction(req.user!.userId, 'PRODUCT_CREATE', 'PRODUCT', newProduct.id)

    // Return product with 201
    return NextResponse.json(
      {
        id: newProduct.id,
        name: newProduct.name,
        sku: newProduct.sku,
        category: newProduct.category,
        createdAt: newProduct.createdAt
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/products - List all products (all authenticated users)
 * Optional filters: ?category={category}, ?sku={sku}
 */
export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  try {
    const prisma = (await import('@/lib/db')).default
    const { searchParams } = new URL(request.url)
    const categoryParam = searchParams.get('category')
    const skuParam = searchParams.get('sku')

    // Build where clause for filters
    const where: any = {}

    if (categoryParam) {
      where.category = categoryParam
    }

    if (skuParam) {
      where.sku = skuParam
    }

    // Fetch products with optional filters
    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        createdAt: true
      }
    })

    return NextResponse.json(products, { status: 200 })
  } catch (error) {
    console.error('List products error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
