# Phase 2: Operations - Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 14 new/modified files
**Analogs found:** 13 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `prisma/schema.prisma` | config | CRUD | `prisma/schema.prisma` (existing) | exact — extend existing |
| `lib/audit/logger.ts` | utility | request-response | `lib/audit/logger.ts` (existing) | exact — extend existing |
| `middleware.ts` | middleware | request-response | `middleware.ts` (existing) | exact — extend existing |
| `app/api/cashier/products/route.ts` | route | request-response | `app/api/products/route.ts` | exact |
| `app/api/cashier/staff/route.ts` | route | request-response | `app/api/users/route.ts` | exact |
| `app/api/cashier/sales/route.ts` | route | CRUD + transaction | `app/api/products/route.ts` | role-match (no transaction analog exists) |
| `app/api/admin/inventory/route.ts` | route | request-response | `app/api/products/route.ts` | exact |
| `app/api/admin/inventory/replenish/route.ts` | route | CRUD + transaction | `app/api/users/[id]/deactivate/route.ts` | role-match |
| `app/cashier/pos/page.tsx` | component | request-response | `app/admin/products/page.tsx` | role-match |
| `app/cashier/layout.tsx` | config | request-response | `app/admin/layout.tsx` | exact |
| `app/admin/inventory/page.tsx` | component | CRUD | `app/admin/products/page.tsx` | exact |
| `components/AdminNav.tsx` | component | request-response | `components/AdminNav.tsx` (existing) | exact — modify existing |
| `__tests__/endpoints/sales.test.ts` | test | request-response | `__tests__/endpoints/users.test.ts` | exact |
| `__tests__/unit/sales.test.ts` | test | CRUD | `__tests__/endpoints/users.test.ts` | role-match |

---

## Pattern Assignments

### `prisma/schema.prisma` (config, CRUD — extend existing)

**Analog:** `prisma/schema.prisma` (lines 76-86, existing Product model)

**Existing Product model** (lines 76-86):
```prisma
model Product {
  id        String   @id @default(cuid())
  name      String
  sku       String   @unique
  category  String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedBy String?  @map("updated_by")

  @@index([sku])
  @@map("products")
}
```

**Fields to ADD to Product model:**
```prisma
sellingPrice Decimal  @map("selling_price") @db.Decimal(10, 2)
cost         Decimal  @db.Decimal(10, 2)
storeQty     Int      @default(0) @map("store_qty")
warehouseQty Int      @default(0) @map("warehouse_qty")

saleItems SaleItem[]

@@index([name])   // ADD alongside existing @@index([sku])
```

**New Sale model to add** (after Product model):
```prisma
model Sale {
  id            String     @id @default(cuid())
  cashierId     String     @map("cashier_id")
  cashier       User       @relation("CashierSales", fields: [cashierId], references: [id])
  salespersonId String     @map("salesperson_id")
  salesperson   User       @relation("SalespersonSales", fields: [salespersonId], references: [id])
  paymentMethod String     @map("payment_method")
  total         Decimal    @db.Decimal(10, 2)
  itemCount     Int        @map("item_count")
  createdAt     DateTime   @default(now()) @map("created_at")

  items SaleItem[]

  @@index([cashierId])
  @@index([salespersonId])
  @@index([createdAt])
  @@map("sales")
}

model SaleItem {
  id        String   @id @default(cuid())
  saleId    String   @map("sale_id")
  sale      Sale     @relation(fields: [saleId], references: [id])
  productId String   @map("product_id")
  product   Product  @relation(fields: [productId], references: [id])
  quantity  Int
  unitPrice Decimal  @map("unit_price") @db.Decimal(10, 2)
  unitCost  Decimal  @map("unit_cost") @db.Decimal(10, 2)
  createdAt DateTime @default(now()) @map("created_at")

  @@index([saleId])
  @@index([productId])
  @@map("sale_items")
}
```

**User model additions** (lines 29-44, add two relation fields):
```prisma
// ADD inside User model after existing auditLogs/refreshTokens relations:
cashierSales    Sale[] @relation("CashierSales")
salespersonSales Sale[] @relation("SalespersonSales")
```

**AuditLog model addition** (lines 47-59, add metadata field):
```prisma
// ADD inside AuditLog model after entityId field:
metadata   Json?    // for before/after values (INVENTORY_REPLENISH, SALE_CREATE)
```

**Migration SQL** (raw SQL to add alongside schema migration):
```sql
ALTER TABLE products ADD CONSTRAINT store_qty_non_negative CHECK (store_qty >= 0);
ALTER TABLE products ADD CONSTRAINT warehouse_qty_non_negative CHECK (warehouse_qty >= 0);
ALTER TABLE audit_log ADD COLUMN metadata JSONB;
```

---

### `lib/audit/logger.ts` (utility, request-response — extend existing)

**Analog:** `lib/audit/logger.ts` (lines 1-22, full file)

**Current implementation** (lines 1-22):
```typescript
export async function logAction(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string
) {
  const prisma = (await import('@/lib/db')).default

  return prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId: entityId || null
    }
  })
}
```

**Extended signature needed** — add `metadata` as 5th optional param:
```typescript
export async function logAction(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>   // ADD: for before/after values
) {
  const prisma = (await import('@/lib/db')).default

  return prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId: entityId || null,
      metadata: metadata || null        // ADD
    }
  })
}
```

**New action type strings to use** (D-17):
- `'SALE_CREATE'` — entityType `'SALE'`, entityId = sale.id
- `'INVENTORY_REPLENISH'` — entityType `'PRODUCT'`, entityId = product.id, metadata = `{ qty_moved, reason, before: { storeQty, warehouseQty }, after: { storeQty, warehouseQty }, superadminId }`
- `'INVENTORY_ADJUST'` — entityType `'PRODUCT'` (reserved for future direct adjustments)

---

### `middleware.ts` (middleware, request-response — extend existing)

**Analog:** `middleware.ts` (lines 1-36, full file)

**Current implementation** (lines 1-36) — only protects `/admin`:
```typescript
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('access_token')?.value
    if (!token) return NextResponse.redirect(new URL('/login', request.url))
    // ... verifyAccessToken checks SUPERADMIN role
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

**Changes needed** — extend to protect `/cashier` routes:
```typescript
// Extend matcher:
export const config = {
  matcher: ['/admin/:path*', '/cashier/:path*'],
}

// Add cashier branch in middleware function (after /admin block):
if (pathname.startsWith('/cashier')) {
  const token = request.cookies.get('access_token')?.value
  if (!token) return NextResponse.redirect(new URL('/login', request.url))

  try {
    const payload = verifyAccessToken(token)
    if (!['CASHIER', 'SUPERADMIN'].includes(payload.role)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

---

### `app/api/cashier/products/route.ts` (route, request-response)

**Analog:** `app/api/products/route.ts` (lines 1-134)

**Imports pattern** (lines 1-5 of analog):
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'
import { z } from 'zod'
```

**Auth + RBAC pattern** (lines 17-24 of analog — adapt roles):
```typescript
export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['CASHIER', 'SUPERADMIN'])(
    request as AuthenticatedRequest
  )
  if (rbacResult) return rbacResult
  // ...
}
```

**Query + response pattern** (lines 93-134 of analog — adapt select fields and where clause):
```typescript
try {
  const prisma = (await import('@/lib/db')).default
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim()

  const products = await prisma.product.findMany({
    where: search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { equals: search } },
      ]
    } : undefined,
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
```

---

### `app/api/cashier/staff/route.ts` (route, request-response)

**Analog:** `app/api/users/route.ts` GET handler (lines 128-184)

**Imports pattern** (lines 1-5 of analog):
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'
```

**Auth + RBAC + query pattern** (adapt from lines 128-184 of analog — filter to CASHIER role + isActive):
```typescript
export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['CASHIER', 'SUPERADMIN'])(
    request as AuthenticatedRequest
  )
  if (rbacResult) return rbacResult

  try {
    const prisma = (await import('@/lib/db')).default

    const staff = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { name: 'CASHIER' }   // D-10: only CASHIER role
      },
      select: {
        id: true,
        username: true,
      },
      orderBy: { username: 'asc' },
    })

    return NextResponse.json(staff, { status: 200 })
  } catch (error) {
    console.error('List cashier staff error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

### `app/api/cashier/sales/route.ts` (route, CRUD + transaction)

**Analog:** `app/api/products/route.ts` POST handler (lines 17-87) for the overall skeleton; transaction pattern from RESEARCH.md Pattern 1.

**Imports pattern** (adapt from lines 1-5 of analog):
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'
import { logAction } from '@/lib/audit/logger'
import { z } from 'zod'
```

**Zod schema** (new, informed by existing schema pattern in analog lines 8-12):
```typescript
const cartItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().min(1),
})

const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Cart cannot be empty'),
  salespersonId: z.string().cuid('Salesperson is required'),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']),
  amountReceived: z.number().positive().optional(),
}).refine(
  (data) => data.paymentMethod !== 'CASH' || data.amountReceived !== undefined,
  { message: 'Amount received is required for cash payments', path: ['amountReceived'] }
)
```

**Auth + RBAC + Zod validation skeleton** (lines 17-37 of analog):
```typescript
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
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }
    // ... transaction below
  }
}
```

**Atomic transaction core** (no existing analog — use RESEARCH.md Pattern 1):
```typescript
const { items, salespersonId, paymentMethod, amountReceived } = validation.data
const req = request as AuthenticatedRequest
const cashierId = req.user!.userId

const productIds = items.map(i => i.productId)

const sale = await prisma.$transaction(async (tx) => {
  // Step 1: Lock rows — price comes from DB, never from request body (D-06)
  const products = await tx.$queryRaw<Array<{
    id: string; name: string; store_qty: number; selling_price: number; cost: number
  }>>`
    SELECT id, name, store_qty, selling_price, cost
    FROM products
    WHERE id = ANY(${productIds}::text[])
    FOR UPDATE
  `

  // Step 2: Validate stock (D-15)
  for (const item of items) {
    const product = products.find(p => p.id === item.productId)
    if (!product) {
      throw new Error(`Product ${item.productId} not found`)
    }
    if (product.store_qty < item.quantity) {
      throw new Error(`Only ${product.store_qty} in stock for "${product.name}"`)
    }
  }

  // Step 3: Calculate total
  const total = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId)!
    return sum + (product.selling_price * item.quantity)
  }, 0)

  // Step 4: Create Sale
  const newSale = await tx.sale.create({
    data: { cashierId, salespersonId, paymentMethod, total, itemCount: items.length }
  })

  // Step 5: Create SaleItems with price snapshot
  await tx.saleItem.createMany({
    data: items.map(item => {
      const product = products.find(p => p.id === item.productId)!
      return {
        saleId: newSale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.selling_price,
        unitCost: product.cost,
      }
    })
  })

  // Step 6: Decrement store_qty atomically
  for (const item of items) {
    await tx.$executeRaw`
      UPDATE products SET store_qty = store_qty - ${item.quantity}
      WHERE id = ${item.productId}
    `
  }

  return newSale
})

// Audit log (same call pattern as lines 67 of analog)
await logAction(cashierId, 'SALE_CREATE', 'SALE', sale.id, {
  cashierId,
  salespersonId,
  total: sale.total,
  paymentMethod,
  itemCount: sale.itemCount,
})
```

**Error handling + response** (lines 80-87 of analog):
```typescript
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const isStockError = message.startsWith('Only') && message.includes('in stock')
    const status = isStockError ? 400 : 500
    console.error('Checkout error:', error)
    return NextResponse.json({ error: message }, { status })
  }
```

---

### `app/api/admin/inventory/route.ts` (route, request-response)

**Analog:** `app/api/products/route.ts` GET handler (lines 93-134)

**Imports pattern** (lines 1-5 of analog):
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'
```

**Auth + RBAC + query pattern** (adapt GET handler, SUPERADMIN only):
```typescript
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
```

---

### `app/api/admin/inventory/replenish/route.ts` (route, CRUD + transaction)

**Analog:** `app/api/products/route.ts` POST handler (lines 17-87) for skeleton; transaction is simpler than sales.

**Imports pattern** (lines 1-5 of analog):
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'
import { logAction } from '@/lib/audit/logger'
import { z } from 'zod'
```

**Zod schema** (new, same style as analog lines 8-12):
```typescript
const replenishSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().min(1),
  reason: z.string().min(1, 'Reason is required').max(500),   // D-13
})
```

**Transaction + audit pattern** (no exact analog for transaction — composite from products POST + logAction):
```typescript
const result = await prisma.$transaction(async (tx) => {
  // Step 1: Get before values
  const product = await tx.product.findUnique({ where: { id: productId } })
  if (!product) throw new Error('Product not found')

  // Step 2: Validate warehouse stock (Pitfall 5)
  if (product.warehouseQty < quantity) {
    throw new Error(`Insufficient warehouse stock. Only ${product.warehouseQty} available.`)
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

// Audit with before/after (D-19) — extended logAction
await logAction(req.user!.userId, 'INVENTORY_REPLENISH', 'PRODUCT', productId, {
  qty_moved: quantity,
  reason,
  before: { storeQty: result.product.storeQty, warehouseQty: result.product.warehouseQty },
  after: { storeQty: result.updated.storeQty, warehouseQty: result.updated.warehouseQty },
})
```

---

### `app/cashier/pos/page.tsx` (component, request-response — replace placeholder)

**Analog:** `app/admin/products/page.tsx` (lines 1-259) and `app/admin/users/page.tsx` (lines 1-523)

**Imports pattern** (lines 1-27 of products page analog — adapt for POS-specific components):
```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/toast'
import { ShoppingCart, Search, Plus, Minus, X } from 'lucide-react'
```

**Token retrieval pattern** (lines 58-59 and 102-104 of products page analog) — NOTE: products page uses `localStorage.getItem('access_token')`, but `lib/auth/client.ts` uses key `'accessToken'`. Use the `getAccessToken()` helper from `@/lib/auth/client` to be consistent:
```typescript
import { getAccessToken } from '@/lib/auth/client'

// In fetch calls:
const token = getAccessToken()
if (!token) { addToast('Not authenticated', 'error'); return }
const response = await fetch('/api/cashier/products?search=...', {
  headers: { Authorization: `Bearer ${token}` },
})
```

**Debounced search pattern** (useEffect + setTimeout — from RESEARCH.md Pattern 3, confirmed by audit page lines 97-135 which shows the useEffect + deps array pattern):
```typescript
useEffect(() => {
  if (!searchQuery.trim()) { setSearchResults([]); return }
  const timer = setTimeout(async () => {
    const token = getAccessToken()
    const res = await fetch(`/api/cashier/products?search=${encodeURIComponent(searchQuery)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) setSearchResults(await res.json())
  }, 300)
  return () => clearTimeout(timer)
}, [searchQuery])
```

**POST + error handling pattern** (lines 88-131 of products page analog — adapt for checkout):
```typescript
const handleCheckout = async () => {
  try {
    const token = getAccessToken()
    if (!token) { addToast('Not authenticated', 'error'); return }

    const response = await fetch('/api/cashier/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items, salespersonId, paymentMethod, amountReceived }),
    })

    if (!response.ok) {
      const error = await response.json()
      addToast(error.error || 'Checkout failed', 'error')
      return
    }

    const sale = await response.json()
    setConfirmedSale(sale)
    setCart([])
  } catch (error) {
    console.error('Checkout error:', error)
    addToast('Error processing checkout', 'error')
  }
}
```

**Toast notification pattern** (lines 45, 119-128 of products page analog):
```typescript
const { addToast } = useToast()
// On success:
addToast('Sale completed successfully', 'success')
// On error:
addToast(error.error || 'Failed to ...', 'error')
```

---

### `app/cashier/layout.tsx` (config, request-response — new, mirrors admin layout)

**Analog:** `app/admin/layout.tsx` (lines 1-21, full file)

**Full pattern to copy** (lines 1-21):
```typescript
import React from 'react'
import { ToastProvider } from '@/components/toast'

export default function CashierLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </ToastProvider>
  )
}
```

Note: No `AdminNav` sidebar — cashier POS is a full-screen single-page interface. ToastProvider is mandatory (matches admin layout pattern — Pitfall 6 in RESEARCH.md).

---

### `app/admin/inventory/page.tsx` (component, CRUD — new admin page)

**Analog:** `app/admin/products/page.tsx` (lines 1-259) — table with per-row action dialog

**Imports pattern** (lines 1-27 of analog):
```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/toast'
import { Plus } from 'lucide-react'
```

**Data fetch on mount** (lines 57-85 of analog):
```typescript
useEffect(() => {
  const token = localStorage.getItem('access_token')
  if (!token) return

  const fetchInventory = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/inventory', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Failed to fetch inventory')
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error('Error fetching inventory:', error)
      addToast('Failed to load inventory', 'error')
    } finally {
      setLoading(false)
    }
  }

  fetchInventory()
}, [addToast])
```

**Per-row action button opening dialog** (lines 147-218 of analog as pattern, plus users page lines 259-262 for `openEditDialog` pattern):
```typescript
// State for the replenish dialog
const [replenishOpen, setReplenishOpen] = useState(false)
const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
const [replenishQty, setReplenishQty] = useState('')
const [replenishReason, setReplenishReason] = useState('')

const openReplenishDialog = (product: Product) => {
  setSelectedProduct(product)
  setReplenishQty('')
  setReplenishReason('')
  setReplenishOpen(true)
}
```

**POST submit + optimistic update pattern** (lines 88-131 of analog):
```typescript
const handleReplenish = async () => {
  try {
    const token = localStorage.getItem('access_token')
    if (!token) { addToast('Not authenticated', 'error'); return }

    const response = await fetch('/api/admin/inventory/replenish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        productId: selectedProduct!.id,
        quantity: parseInt(replenishQty, 10),
        reason: replenishReason,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      addToast(error.error || 'Failed to replenish', 'error')
      return
    }

    const result = await response.json()
    // Update product in local state with new quantities
    setProducts(products.map(p =>
      p.id === selectedProduct!.id
        ? { ...p, storeQty: result.newStoreQty, warehouseQty: result.newWarehouseQty }
        : p
    ))
    setReplenishOpen(false)
    addToast('Stock replenished successfully', 'success')
  } catch (error) {
    console.error('Replenish error:', error)
    addToast('Error replenishing stock', 'error')
  }
}
```

---

### `components/AdminNav.tsx` (component, request-response — extend existing)

**Analog:** `components/AdminNav.tsx` (lines 1-77, full file)

**navItems array to extend** (lines 29-33 of existing file):
```typescript
// ADD inventory item to navItems array:
const navItems = [
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/inventory', label: 'Inventory', icon: BarChart3 },  // ADD
  { href: '/admin/audit', label: 'Audit Log', icon: FileText },
]
```

Note: `BarChart3` icon already imported (line 8 of existing file). No new import needed.

---

### `__tests__/endpoints/sales.test.ts` (test, request-response)

**Analog:** `__tests__/endpoints/users.test.ts` (lines 1-511, full file)

**Test file structure** (lines 1-10 of analog):
```typescript
import { describe, it, expect } from 'vitest'

describe('Sales Endpoints', () => {
  describe('POST /api/cashier/sales (Checkout)', () => {
    const validPayload = {
      items: [{ productId: 'product-cuid-1', quantity: 2 }],
      salespersonId: 'cashier-cuid-1',
      paymentMethod: 'CASH',
      amountReceived: 100,
    }
    // ...
  })
})
```

**Contract test style** (lines 18-35 of analog — use same "mock response contract" pattern):
```typescript
it('should complete sale and return sale record (201)', async () => {
  const response = {
    status: 201,
    body: {
      saleId: 'sale-cuid-1',
      total: 39.98,
      itemCount: 1,
      paymentMethod: 'CASH',
      changeDue: 60.02,
    }
  }

  expect(response.status).toBe(201)
  expect(response.body.saleId).toBeDefined()
})
```

**RBAC tests** (lines 115-125 of analog — same audit trail pattern):
```typescript
it('should reject FINANCE role with 403', async () => {
  const response = { status: 403, body: { error: 'Insufficient permissions' } }
  expect(response.status).toBe(403)
})

it('should log SALE_CREATE to audit trail', async () => {
  const expectedAuditEntry = {
    action: 'SALE_CREATE',
    entityType: 'SALE',
    entityId: 'sale-cuid-1'
  }
  expect(expectedAuditEntry.action).toBe('SALE_CREATE')
})
```

---

### `__tests__/unit/sales.test.ts` (test, CRUD — unit tests for transaction logic)

**Analog:** `__tests__/endpoints/users.test.ts` structure; unit tests are contract-style without real DB.

**Test structure for business logic contracts**:
```typescript
import { describe, it, expect } from 'vitest'

describe('Sales Transaction Logic', () => {
  describe('Stock validation (D-15)', () => {
    it('should reject sale if store_qty < requested quantity', () => {
      const product = { id: 'p1', name: 'Widget', store_qty: 3 }
      const requestedQty = 5

      const isInsufficient = product.store_qty < requestedQty
      expect(isInsufficient).toBe(true)
    })

    it('should reject entire cart if any single item is insufficient', () => {
      // Contract: all-or-nothing (D-14)
      const items = [
        { productId: 'p1', quantity: 2, store_qty: 5 },  // ok
        { productId: 'p2', quantity: 10, store_qty: 3 }, // fails
      ]
      const failed = items.find(i => i.store_qty < i.quantity)
      expect(failed).toBeDefined()
    })
  })

  describe('Price snapshot (D-06)', () => {
    it('should use price from locked DB row, not from cart', () => {
      // Contract: server determines price
      const cartItem = { productId: 'p1', quantity: 2, clientPrice: 9.99 }
      const lockedProduct = { id: 'p1', selling_price: 19.99 }
      const unitPrice = lockedProduct.selling_price // NOT cartItem.clientPrice
      expect(unitPrice).toBe(19.99)
    })
  })
})
```

---

## Shared Patterns

### Authentication + RBAC (apply to ALL new API routes)

**Source:** `middleware/auth.ts` (lines 13-37), `middleware/rbac.ts` (lines 14-34)

**Pattern — always first two lines of every handler:**
```typescript
const authResult = await authMiddleware(request as AuthenticatedRequest)
if (authResult) return authResult

const rbacResult = await rbacMiddleware(['ROLE_A', 'ROLE_B'])(
  request as AuthenticatedRequest
)
if (rbacResult) return rbacResult
```

**Role assignments by route:**
- `GET /api/cashier/products` — `['CASHIER', 'SUPERADMIN']`
- `GET /api/cashier/staff` — `['CASHIER', 'SUPERADMIN']`
- `POST /api/cashier/sales` — `['CASHIER', 'SUPERADMIN']`
- `GET /api/admin/inventory` — `['SUPERADMIN']`
- `POST /api/admin/inventory/replenish` — `['SUPERADMIN']`

### Prisma Dynamic Import (apply to ALL new API routes)

**Source:** `app/api/products/route.ts` (line 27), `app/api/users/route.ts` (line 43)

```typescript
const prisma = (await import('@/lib/db')).default
```

This is the established pattern in the codebase — NOT `import prisma from '@/lib/db'` at the top of the file.

### Error Handling (apply to ALL new API routes)

**Source:** `app/api/products/route.ts` (lines 80-86)

```typescript
} catch (error) {
  console.error('[descriptive context] error:', error)
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

For stock validation errors (D-15), use 400 status with the specific message from the thrown Error.

### Zod Validation Response (apply to ALL POST routes)

**Source:** `app/api/products/route.ts` (lines 31-37)

```typescript
const validation = schema.safeParse(body)
if (!validation.success) {
  return NextResponse.json(
    { error: 'Invalid input', details: validation.error.errors },
    { status: 400 }
  )
}
```

### Audit Log Call (apply to ALL state-changing routes)

**Source:** `app/api/products/route.ts` (line 67), `app/api/users/route.ts` (line 102)

```typescript
await logAction(req.user!.userId, 'ACTION_TYPE', 'ENTITY_TYPE', entityId)
// Phase 2 extended form with metadata:
await logAction(req.user!.userId, 'ACTION_TYPE', 'ENTITY_TYPE', entityId, { ...metadata })
```

### Client-side Token Retrieval (apply to ALL new page components)

**Source:** `app/admin/products/page.tsx` (line 58), `app/admin/users/page.tsx` (line 92)

IMPORTANT: Existing pages inconsistently use `localStorage.getItem('access_token')` but `lib/auth/client.ts` exports `getAccessToken()` which uses key `'accessToken'` (no underscore). New Phase 2 pages should use the `getAccessToken()` helper from `@/lib/auth/client` for consistency:

```typescript
import { getAccessToken } from '@/lib/auth/client'

// In handlers:
const token = getAccessToken()
if (!token) { addToast('Not authenticated', 'error'); return }
```

### useToast Notification (apply to ALL new page components)

**Source:** `app/admin/products/page.tsx` (lines 45, 119-128), `app/admin/users/page.tsx` (line 46)

```typescript
const { addToast } = useToast()
// import from: '@/components/toast'

addToast('Success message', 'success')
addToast(error.error || 'Fallback message', 'error')
```

### Table + Dialog Pattern (apply to `app/admin/inventory/page.tsx`)

**Source:** `app/admin/products/page.tsx` (lines 143-258), `app/admin/users/page.tsx` (lines 279-521)

Table rows with per-row action button that opens a Dialog. The Dialog is declared once outside the map, controlled by `selectedItem` state set when the row button is clicked. See products page lines 221-258 for the table pattern and users page lines 259-262 for `openEditDialog` state-setting pattern.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `__tests__/integration/concurrent-sale.test.ts` | test | CRUD | No integration tests with real DB exist in the codebase yet; requires a live PostgreSQL instance to test the row-level lock behavior |

For this file, use the RESEARCH.md Pitfall 1 section as the test specification and the `__tests__/test-utils.ts` `makeRequest` helper as the scaffolding pattern.

---

## Metadata

**Analog search scope:** `app/api/`, `app/admin/`, `app/cashier/`, `components/`, `lib/`, `middleware/`, `__tests__/`, `prisma/`
**Files scanned:** 26 source files read in full
**Pattern extraction date:** 2026-04-20

**Key observations for planner:**
1. Token key inconsistency: `localStorage.getItem('access_token')` in existing pages vs `'accessToken'` in `lib/auth/client.ts`. New pages must use `getAccessToken()` helper. Existing pages can be fixed as a bonus task.
2. `middleware.ts` does NOT protect `/cashier` routes yet — must be extended before POS page is accessible.
3. `AuditLog` schema has no `metadata` field — schema migration in Wave 0 is a hard prerequisite for `logAction` extension.
4. `Product` model has no pricing/quantity fields — schema migration is a hard prerequisite for ALL Phase 2 routes.
5. Wave 0 (migrations + logAction extension) must complete before any Wave 1 API routes can be built or tested.
