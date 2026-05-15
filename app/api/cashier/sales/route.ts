import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'
import { z } from 'zod'

const cartItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().min(1),
})

const checkoutSchema = z
  .object({
    items: z.array(cartItemSchema).min(1, 'Cart cannot be empty'),
    salespersonId: z.string().cuid('Salesperson is required'),
    paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']),
    amountReceived: z.number().positive().optional(),
  })
  .refine(
    (data) => data.paymentMethod !== 'CASH' || data.amountReceived !== undefined,
    { message: 'Amount received is required for cash payments', path: ['amountReceived'] }
  )

export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['CASHIER', 'SUPERADMIN'])(
    request as AuthenticatedRequest
  )
  if (rbacResult) return rbacResult

  try {
    const prisma = (await import('@/lib/db')).default
    const body = await request.json()

    const validation = checkoutSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { items, salespersonId, paymentMethod, amountReceived } = validation.data
    const req = request as AuthenticatedRequest
    const cashierId = req.user!.userId
    const productIds = items.map((i) => i.productId)

    const sale = await prisma.$transaction(async (tx) => {
      // Step 1: Lock product rows — price comes from DB, NEVER from request body (T-02-04)
      const products = await tx.$queryRaw<
        Array<{
          id: string
          name: string
          store_qty: number
          selling_price: number
          cost: number
        }>
      >`
        SELECT id, name, store_qty, selling_price, cost
        FROM products
        WHERE id = ANY(${productIds}::text[])
        FOR UPDATE
      `

      // Step 2: Validate stock for each item (T-02-05)
      for (const item of items) {
        const product = products.find((p) => p.id === item.productId)
        if (!product) {
          throw new Error(`Product ${item.productId} not found`)
        }
        if (product.store_qty < item.quantity) {
          throw new Error(
            `Only ${product.store_qty} in stock for "${product.name}"`
          )
        }
      }

      // Step 3: Calculate total from locked product prices
      const total = items.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.productId)!
        return sum + product.selling_price * item.quantity
      }, 0)

      // Step 4: Create Sale record
      const newSale = await tx.sale.create({
        data: {
          cashierId,
          salespersonId,
          paymentMethod,
          total,
          itemCount: items.length,
        },
      })

      // Step 5: Create SaleItem records with price snapshot (T-02-04)
      await tx.saleItem.createMany({
        data: items.map((item) => {
          const product = products.find((p) => p.id === item.productId)!
          return {
            saleId: newSale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: product.selling_price,
            unitCost: product.cost,
          }
        }),
      })

      // Step 6: Decrement store_qty atomically for each product (T-02-05)
      for (const item of items) {
        await tx.$executeRaw`
          UPDATE products
          SET store_qty = store_qty - ${item.quantity}
          WHERE id = ${item.productId}
        `
      }

      // Step 7: Create audit log atomically within transaction (AUDIT-02, SALE-08)
      // If this fails, entire transaction rolls back — no sale without audit trail
      await tx.auditLog.create({
        data: {
          userId: cashierId,
          action: 'SALE_CREATE',
          entityType: 'SALE',
          entityId: newSale.id,
          metadata: {
            cashierId,
            salespersonId,
            total: Number(newSale.total),
            paymentMethod,
            itemCount: newSale.itemCount,
          },
        },
      })

      return newSale
    })

    const changeDue =
      paymentMethod === 'CASH' && amountReceived !== undefined
        ? amountReceived - Number(sale.total)
        : undefined

    return NextResponse.json(
      {
        saleId: sale.id,
        total: Number(sale.total),
        itemCount: sale.itemCount,
        paymentMethod: sale.paymentMethod,
        ...(changeDue !== undefined && { changeDue }),
      },
      { status: 201 }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error'
    const isStockError =
      message.startsWith('Only') && message.includes('in stock')
    const status = isStockError ? 400 : 500
    if (!isStockError) console.error('Checkout error:', error)
    return NextResponse.json({ error: message }, { status })
  }
}
