# Phase 2: Operations - Research

**Researched:** 2026-04-20
**Domain:** POS interface, inventory management, atomic transactions, Prisma schema extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Two-panel layout: left panel = product search (by name or SKU text input, live-filtered list), right panel = running cart with items, quantities, subtotals, and checkout button
- **D-02:** Cashier types into search bar to find products; clicking a result adds it to cart; quantity can be adjusted in-cart
- **D-03:** After checkout, show an on-screen confirmation screen with sale total, items sold, salesperson credited, and payment method. Cashier dismisses it to start a new sale. No printer integration.
- **D-04:** Add `selling_price` (Decimal) and `cost` (Decimal) to the existing Product model. Required fields — no product should exist without pricing.
- **D-05:** Add `store_qty` (Int, default 0) and `warehouse_qty` (Int, default 0) directly to the Product model. No separate Inventory table.
- **D-06:** `selling_price` and `cost` must be captured on the Sale record at time of sale (snapshot), not looked up from Product at report time.
- **D-07:** Payment method selector at checkout: Cash / Card / Transfer. No payment gateway integration.
- **D-08:** For Cash payments, cashier enters amount received and system displays change due. Card and Transfer have no amount-received field.
- **D-09:** Cashier must explicitly pick a salesperson before completing checkout. No auto-attribution.
- **D-10:** Salesperson picker shows only active users with the CASHIER role.
- **D-11:** Attribution is recorded at sale time and is immutable after confirmation.
- **D-12:** Dedicated `/admin/inventory` page. Shows table of all products with current store_qty and warehouse_qty. Each row has an "Add stock" action.
- **D-13:** Replenishment form: product (pre-selected), quantity to move (warehouse to store), required reason/note field. Submitted via POST; inventory updates atomically; audit log entry created.
- **D-14:** Sale completion and inventory decrement in single Prisma transaction: create Sale + SaleItems + decrement store_qty. Any step failure rolls back entire transaction.
- **D-15:** Before sale completes, validate store_qty >= total quantity ordered. Reject with "Only X in stock — cannot complete sale."
- **D-16:** store_qty never goes negative. Application-layer pre-check + database CHECK constraint.
- **D-17:** Extend `logAction` utility with SALE_CREATE, INVENTORY_REPLENISH, INVENTORY_ADJUST action types.
- **D-18:** Sale audit entry: records sale_id, cashier_id, salesperson_id, total, payment_method, item count.
- **D-19:** Replenishment audit entry: records product_id, qty_moved, reason, superadmin_id, before/after quantities.

### Claude's Discretion
- Exact search debounce timing (suggest 300ms)
- Cart quantity increment/decrement UI (+ / - buttons vs direct input)
- Confirmation screen design and dismiss behavior
- Prisma transaction isolation level (default READ COMMITTED is fine)
- Specific error message copy for insufficient stock
- Index strategy for Product name search (suggest GIN index or ILIKE with name index)

### Deferred Ideas (OUT OF SCOPE)
- Barcode scanner hardware integration
- Printed receipt / receipt email
- Card payment gateway (Stripe/Square)
- Low-stock alerts
- Bulk inventory import
- Multi-salesperson split attribution
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INV-01 | Cashier can check if product is available at store floor | Product.store_qty field; GET /api/cashier/products returns store_qty |
| INV-02 | Cashier can check if product is available in warehouse/backstock | Product.warehouse_qty field; same endpoint returns warehouse_qty |
| INV-03 | Real-time inventory displays accurate count at all times | Decrement inside transaction; GET always reads from DB (no stale cache) |
| INV-04 | Store inventory automatically decreases by 1 when sale completes | Prisma interactive transaction: decrement store_qty atomically with Sale create |
| INV-05 | Superadmin can manually replenish inventory from warehouse to store | POST /api/admin/inventory/replenish; atomic warehouse_qty-- / store_qty++ |
| INV-06 | Replenishment transaction recorded in audit trail with timestamp and user | logAction(INVENTORY_REPLENISH) after successful replenishment |
| SALE-01 | Cashier can search products by name or scan barcode | GET /api/cashier/products?search=... with ILIKE name or exact SKU match |
| SALE-02 | Cashier can add products to transaction with quantity | Cart state (useState/useReducer) in client component; quantity field |
| SALE-03 | Cashier can remove or adjust items before payment | Cart mutation functions; no API call until checkout |
| SALE-04 | System calculates subtotal, tax, and total automatically | Client-side calculation from cart items x selling_price (no tax in v1 — SALE-04 says tax but REQUIREMENTS has no tax config, treat as subtotal = total) |
| SALE-05 | Cashier can process payment in cash and card | Payment method selector (Cash/Card/Transfer); cash shows change due |
| SALE-06 | Cashier can attribute sale to themselves or select another staff member | Salesperson picker: GET /api/cashier/staff returns CASHIER-role users |
| SALE-07 | System generates itemized receipt | On-screen confirmation after POST /api/cashier/sales succeeds |
| SALE-08 | Inventory decrease happens atomically with sale completion | Prisma $transaction with all Sale/SaleItem creates + store_qty decrements |
| PROD-02 | Superadmin can set cost of goods for each product | cost (Decimal) field on Product; update existing product create form |
| PROD-03 | Superadmin can assign barcode to product for scanning | sku field already exists; product search by SKU covers barcode scan use case |
| PROD-04 | Product list accessible to cashiers for barcode scanning | GET /api/cashier/products (CASHIER + SUPERADMIN roles) |
| AUDIT-02 | Inventory changes logged with before/after quantities | logAction extended with beforeValues/afterValues; replenishment logs both |
</phase_requirements>

---

## Summary

Phase 2 extends an already-functional Phase 1 foundation (JWT auth, RBAC middleware, audit logging, admin UI) to build the operational core: a cashier POS interface and superadmin inventory management. The primary technical challenge is the atomic sale transaction — creating a Sale record, SaleItem records, and decrementing stock quantities as a single indivisible database operation that cannot partially succeed.

The existing codebase uses a consistent pattern: Next.js 14 App Router with API routes, Prisma 7 (installed as `6.19.3` — the package still uses the `@prisma/client` npm name but with Prisma 7 internals), plain `useState`/`useEffect` for client state (no TanStack Query installed), and `fetch` with `Authorization: Bearer` header. All new code must match these patterns exactly — no new state management libraries are needed, and TanStack Query is not installed.

The key architectural pattern for the atomic transaction uses Prisma's `$transaction` interactive callback API. Inside the callback, `$queryRaw` with `SELECT ... FOR UPDATE` acquires row-level locks on each product before checking and decrementing quantities. This prevents the race condition where two cashiers check stock simultaneously, both see 1 unit available, and both proceed — resulting in -1 inventory.

**Primary recommendation:** Implement the checkout flow as a single `prisma.$transaction(async (tx) => {...})` with `tx.$queryRaw<Product[]>\`SELECT * FROM products WHERE id = ANY(${productIds}) FOR UPDATE\`` inside, then validate quantities, create Sale/SaleItem records, and decrement atomically.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Product search (live, debounced) | Browser / Client | API / Backend | Search input is interactive; debounce at client; API does actual DB query |
| Cart state (items, quantities, subtotals) | Browser / Client | — | Pure UI state; no DB interaction until checkout |
| Payment method selection + cash change calculation | Browser / Client | — | Change due = amount_received - total; pure arithmetic |
| Salesperson picker | Browser / Client | API / Backend | Fetch CASHIER users once; display in dropdown |
| Checkout submission | API / Backend | Database / Storage | Atomic transaction logic must live in server-side API route |
| Inventory decrement (atomic) | Database / Storage | API / Backend | PostgreSQL row-level lock + transaction is the enforcement point |
| Inventory replenishment | API / Backend | Database / Storage | Superadmin-only endpoint; updates warehouse_qty and store_qty atomically |
| Audit logging for sales/replenishment | API / Backend | Database / Storage | logAction called server-side after successful transaction |
| Confirmation receipt display | Browser / Client | — | Show sale response data; no additional DB call |
| Admin inventory list | Browser / Client | API / Backend | Fetch and display; superadmin only |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma ORM | 6.19.3 (installed) | Schema extension, atomic transactions, migrations | Already in use; `$transaction` API covers row-locking via `$queryRaw FOR UPDATE` |
| Next.js App Router | 16.2.3 (installed) | API routes + React Server/Client components | Already in use; API routes are the endpoint pattern |
| React | 19.2.5 (installed) | POS UI client components | Already in use; `useState`/`useReducer` for cart |
| Zod | 4.3.6 (installed) | Checkout + replenishment input validation | Already used on all API routes |
| TypeScript | 5.x (installed) | Type safety | Already in use; Decimal type needs careful handling |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fetch (built-in) | Browser native | API calls from POS UI | Already the pattern in admin pages; consistent |
| lucide-react | 1.8.0 (installed) | Icons (ShoppingCart, Search, Plus, Minus) | Already used in AdminNav |
| shadcn/ui components | Installed | Button, Input, Select, Table, Dialog | Already available; POS uses same component library |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain useState for cart | TanStack Query | TanStack Query not installed; adding it for cart state is over-engineering; useState/useReducer is sufficient for local cart |
| $queryRaw FOR UPDATE | RepeatableRead isolation | FOR UPDATE is more targeted (locks specific rows, not whole transaction read set); preferred for high-concurrency POS |
| Decimal fields | Float fields | Float loses precision on financial values (e.g., 19.99 becomes 19.990000000001); always use Decimal for prices |

**Installation:** No new packages required for Phase 2 core. All dependencies are already installed.

**Version verification:** [VERIFIED: package.json in codebase] All versions confirmed against installed packages.

---

## Architecture Patterns

### System Architecture Diagram

```
Cashier Browser
  |
  | [search input, debounced 300ms]
  v
GET /api/cashier/products?search=... (CASHIER | SUPERADMIN)
  |-- authMiddleware --> rbacMiddleware(['CASHIER','SUPERADMIN'])
  |-- prisma.product.findMany({ where: { OR: [name ILIKE, sku exact] } })
  |-- returns: [{id, name, sku, selling_price, store_qty, warehouse_qty}]
  v
Cashier Browser
  |
  | [cart state: CartItem[] via useState]
  | [add item, adjust qty, remove item -- pure UI]
  | [select salesperson from GET /api/cashier/staff]
  | [select payment method; if Cash: enter amount_received]
  |
  | [checkout button]
  v
POST /api/cashier/sales (CASHIER | SUPERADMIN)
  |-- authMiddleware --> rbacMiddleware(['CASHIER','SUPERADMIN'])
  |-- Zod validate: { items: [{productId, quantity}], salespersonId, paymentMethod, amountReceived? }
  |
  |-- prisma.$transaction(async (tx) => {
  |     1. tx.$queryRaw`SELECT * FROM products WHERE id = ANY(${ids}) FOR UPDATE`
  |        [row-level lock acquired on each product row]
  |     2. For each item: validate tx store_qty >= requested quantity
  |        [if ANY fail: throw Error("Only X in stock") -> automatic rollback]
  |     3. tx.sale.create({ cashierId, salespersonId, paymentMethod, total })
  |     4. tx.saleItem.createMany([{saleId, productId, quantity, unitPrice, unitCost}])
  |        [price snapshot from locked product row, not from request body]
  |     5. For each item: tx.$executeRaw`UPDATE products SET store_qty = store_qty - ${qty} WHERE id = ${id}`
  |     6. return sale
  |   })
  |-- logAction(SALE_CREATE, SALE, sale.id, { saleId, cashierId, salespersonId, ... })
  |-- return: { saleId, total, items, salesperson, paymentMethod, changedue? }
  v
Cashier Browser
  [show confirmation screen; cashier dismisses to start new sale]


Superadmin Browser
  |
  v
GET /api/admin/inventory (SUPERADMIN only)
  |-- returns: [{id, name, sku, store_qty, warehouse_qty, selling_price, cost}]
  v
Superadmin Browser
  |
  | [clicks "Add stock" on product row]
  | [fills form: quantity, reason]
  v
POST /api/admin/inventory/replenish (SUPERADMIN only)
  |-- authMiddleware --> rbacMiddleware(['SUPERADMIN'])
  |-- Zod validate: { productId, quantity, reason }
  |-- prisma.$transaction(async (tx) => {
  |     1. tx.product.findUnique(productId) -- get before values
  |     2. validate warehouse_qty >= quantity
  |     3. tx.product.update({ store_qty: { increment: qty }, warehouse_qty: { decrement: qty } })
  |   })
  |-- logAction(INVENTORY_REPLENISH, PRODUCT, productId, { before, after, reason, qty })
  |-- return: { productId, newStoreQty, newWarehouseQty }
```

### Recommended Project Structure

New files to create (additions to existing codebase):

```
app/
├── api/
│   ├── cashier/
│   │   ├── products/
│   │   │   └── route.ts         # GET product search (CASHIER + SUPERADMIN)
│   │   ├── staff/
│   │   │   └── route.ts         # GET CASHIER-role users for salesperson picker
│   │   └── sales/
│   │       └── route.ts         # POST atomic checkout transaction
│   └── admin/
│       └── inventory/
│           ├── route.ts         # GET inventory list (SUPERADMIN)
│           └── replenish/
│               └── route.ts     # POST replenishment (SUPERADMIN)
├── cashier/
│   └── pos/
│       └── page.tsx             # Replace placeholder with full POS UI (client component)
└── admin/
    └── inventory/
        └── page.tsx             # New inventory replenishment admin page

lib/
└── audit/
    └── logger.ts                # Extend logAction signature (add metadata param)

prisma/
└── schema.prisma                # Add selling_price, cost, store_qty, warehouse_qty to Product
                                 # Add Sale, SaleItem models
                                 # Add CHECK constraint via migration SQL
```

### Pattern 1: Prisma Interactive Transaction with Row-Level Lock

**What:** Use `$transaction` interactive callback; inside, use `$queryRaw` with `FOR UPDATE` to lock rows before reading and modifying them.

**When to use:** Any operation where a read-then-write must be atomic (the "check then decrement" inventory pattern).

**Example:**
```typescript
// Source: [VERIFIED: Context7 /prisma/web - transactions.mdx]
const sale = await prisma.$transaction(async (tx) => {
  // Step 1: Lock product rows for this transaction
  const products = await tx.$queryRaw<Array<{
    id: string
    name: string
    store_qty: number
    selling_price: number
    cost: number
  }>>`
    SELECT id, name, store_qty, selling_price, cost
    FROM products
    WHERE id = ANY(${productIds}::text[])
    FOR UPDATE
  `

  // Step 2: Validate stock for each item in cart
  for (const item of cartItems) {
    const product = products.find(p => p.id === item.productId)
    if (!product) throw new Error(`Product ${item.productId} not found`)
    if (product.store_qty < item.quantity) {
      throw new Error(`Only ${product.store_qty} in stock for "${product.name}"`)
    }
  }

  // Step 3: Create Sale record
  const total = cartItems.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId)!
    return sum + (Number(product.selling_price) * item.quantity)
  }, 0)

  const sale = await tx.sale.create({
    data: {
      cashierId,
      salespersonId,
      paymentMethod,
      total,
      itemCount: cartItems.length,
    }
  })

  // Step 4: Create SaleItem records with price snapshot
  await tx.saleItem.createMany({
    data: cartItems.map(item => {
      const product = products.find(p => p.id === item.productId)!
      return {
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.selling_price,  // snapshot at time of sale
        unitCost: product.cost,            // snapshot at time of sale
      }
    })
  })

  // Step 5: Decrement store_qty atomically for each product
  for (const item of cartItems) {
    await tx.$executeRaw`
      UPDATE products
      SET store_qty = store_qty - ${item.quantity}
      WHERE id = ${item.productId}
    `
  }

  return sale
})
```

**Critical note on Prisma Decimal type:** `product.selling_price` returned from `$queryRaw` is a `number` (PostgreSQL numeric becomes JS number). When using the ORM `product.sellingPrice`, it is a `Prisma.Decimal` object — use `Number(product.sellingPrice)` for arithmetic. Store totals using `Decimal` type in the schema to avoid floating-point errors.

### Pattern 2: Zod Schema for Checkout Validation

**What:** Validate the checkout request body before the transaction begins.

**When to use:** Every API route input (existing convention in codebase).

```typescript
// Source: [VERIFIED: existing codebase pattern - app/api/products/route.ts]
import { z } from 'zod'

const cartItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().min(1),
})

const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Cart cannot be empty'),
  salespersonId: z.string().cuid('Salesperson is required'),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']),
  amountReceived: z.number().positive().optional(), // only for CASH
}).refine(
  (data) => data.paymentMethod !== 'CASH' || data.amountReceived !== undefined,
  { message: 'Amount received is required for cash payments', path: ['amountReceived'] }
)
```

### Pattern 3: POS Client Component with Cart State

**What:** Two-panel POS layout as a `'use client'` component using `useState` for cart, `useEffect` for debounced product search.

**When to use:** The POS page is fully interactive; no server component needed.

```typescript
// Source: [ASSUMED - based on existing admin page patterns in codebase]
'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAccessToken } from '@/lib/auth/client'

interface CartItem {
  productId: string
  name: string
  sku: string
  quantity: number
  unitPrice: number  // selling_price at time of adding to cart
  unitCost: number   // cost at time of adding to cart
  storeQty: number   // current stock for validation feedback
}

export default function PosPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [salespersonId, setSalespersonId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH')
  const [amountReceived, setAmountReceived] = useState<string>('')
  const [confirmedSale, setConfirmedSale] = useState<SaleConfirmation | null>(null)

  // Debounced search: 300ms (Claude's Discretion)
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

  // Cart operations
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id)
      if (existing) {
        return prev.map(i => i.productId === product.id
          ? { ...i, quantity: i.quantity + 1 }
          : i)
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        quantity: 1,
        unitPrice: product.sellingPrice,
        unitCost: product.cost,
        storeQty: product.storeQty,
      }]
    })
  }

  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const changeDue = paymentMethod === 'CASH' && amountReceived
    ? parseFloat(amountReceived) - total
    : null
}
```

### Pattern 4: Extended logAction with Metadata

**What:** Add optional metadata parameter to `logAction` to capture before/after values and context.

**When to use:** SALE_CREATE, INVENTORY_REPLENISH, INVENTORY_ADJUST (D-17 through D-19).

**Current logAction signature:** `logAction(userId, action, entityType, entityId?)`

**Extended signature needed:**
```typescript
// Source: [VERIFIED: lib/audit/logger.ts in codebase - current implementation]
// Extend to:
export async function logAction(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>  // ADD: for before/after values
) {
  const prisma = (await import('@/lib/db')).default

  return prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId: entityId || null,
      // metadata stored as JSON in existing schema
    }
  })
}
```

**Critical issue: The existing AuditLog schema does NOT have a `metadata` or `beforeValues`/`afterValues` field.** The Phase 1 schema (verified in codebase) has only: `id`, `userId`, `action`, `entityType`, `entityId`, `createdAt`. To support D-19 (before/after quantities), a migration must add a `metadata Json?` column to `audit_log`.

### Anti-Patterns to Avoid

- **Reading selling_price from the request body for SaleItem:** The price snapshot MUST come from the locked database row, not from the client. A malicious cashier could send a manipulated price. Always use the product data returned from `SELECT ... FOR UPDATE`.
- **Two separate transactions for Sale and inventory decrement:** Violates D-14. Always one `$transaction` for both.
- **Using `product.update({ store_qty: { decrement: qty } })` without locking first:** Prisma's `decrement` is atomic at the SQL level (UPDATE ... SET store_qty = store_qty - qty), but without the FOR UPDATE lock, another concurrent transaction can read the pre-decrement value and both succeed with stock going negative.
- **Storing Decimal values as Float in Prisma schema:** `selling_price Float` loses precision. Use `selling_price Decimal @db.Decimal(10, 2)`.
- **Checking stock in the API route BEFORE the transaction:** The check must be INSIDE the transaction, after the FOR UPDATE lock, to prevent TOCTOU race conditions.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic multi-table update | Custom lock logic / Redis locks | Prisma `$transaction` + `$queryRaw FOR UPDATE` | PostgreSQL handles row locking natively; Prisma wraps it cleanly |
| Input validation | Custom validation middleware | Zod schemas (already installed, already used everywhere) | Type inference, composable schemas, already the codebase convention |
| Role enforcement | Per-route if-else role checks | `rbacMiddleware(['CASHIER', 'SUPERADMIN'])` (already exists) | Centralized, tested, consistent with Phase 1 |
| Audit trail writes | Inline `prisma.auditLog.create()` | `logAction()` utility (already exists) | Consistent format; only one place to update when schema changes |
| Debounce for search | Custom debounce utility | `setTimeout` + `clearTimeout` in `useEffect` (standard pattern) | No library needed; existing admin pages show the pattern |
| Change due calculation | Complex logic | `amountReceived - total` (one line) | Trivial arithmetic; no library needed |

**Key insight:** Phase 2 has no new library dependencies. The complexity is in the Prisma transaction pattern and UI state management — both solved with tools already installed.

---

## Common Pitfalls

### Pitfall 1: TOCTOU Race Condition (Check-Then-Act Without Lock)
**What goes wrong:** Two cashiers simultaneously check stock (both see `store_qty = 1`), both pass validation, both submit. First transaction commits (store_qty becomes 0), second transaction also commits (store_qty becomes -1).
**Why it happens:** Without row-level locking, PostgreSQL `READ COMMITTED` isolation allows both transactions to read the pre-update value.
**How to avoid:** Issue `SELECT ... FOR UPDATE` inside the `$transaction` callback BEFORE any validation. The second transaction blocks until the first commits or rolls back.
**Warning signs:** Negative store_qty values appearing in the database; intermittent "only 1 left" errors when no stock issues should exist.

### Pitfall 2: Price Mutation Between Cart Load and Checkout
**What goes wrong:** Cashier loads cart at price $10. Superadmin updates product price to $15 before checkout. Cashier checks out. If price is read from Product at checkout time (not from cart), either the wrong price is charged or the audit trail is inconsistent with what the cashier showed the customer.
**Why it happens:** Cart items display client-side price; server uses current DB price.
**How to avoid:** The SaleItem `unitPrice` snapshot comes from the locked product row INSIDE the transaction (Step 4 in Pattern 1). The client sends `productId + quantity` only — server determines price. This is D-06.
**Warning signs:** Margin reports showing different totals than receipt amounts.

### Pitfall 3: AuditLog Schema Missing Metadata Field
**What goes wrong:** D-19 requires before/after quantities in replenishment audit entries, but the existing AuditLog schema has no field for this data.
**Why it happens:** Phase 1 implemented a minimal audit schema; before/after values were not needed for Phase 1 actions.
**How to avoid:** Wave 0 migration must ADD `metadata Json?` column to `audit_log` table AND update `logAction` signature to accept and persist it.
**Warning signs:** Attempting to store replenishment details in `entityId` (string field — cannot hold structured data).

### Pitfall 4: Decimal / Float Precision Loss
**What goes wrong:** `selling_price: 19.99` becomes `19.990000000001` in JavaScript float arithmetic. Totals drift by fractions of cents.
**Why it happens:** JavaScript's IEEE 754 floating point cannot represent all decimal fractions exactly.
**How to avoid:** Use `Decimal @db.Decimal(10, 2)` in Prisma schema. When doing arithmetic in TypeScript, convert with `Number(price)` or use Decimal.js. Store totals as `Decimal` in Sale model.
**Warning signs:** Totals that are off by $0.01 periodically; test assertions failing by tiny fractions.

### Pitfall 5: Replenishment Allows Negative Warehouse Qty
**What goes wrong:** Superadmin replenishes 50 units from warehouse but warehouse only has 30. No validation → warehouse_qty goes to -20.
**Why it happens:** Only store_qty has a "never negative" requirement in D-16; warehouse_qty is not explicitly protected.
**How to avoid:** Add application-layer check: `if product.warehouse_qty < quantity → throw error "Insufficient warehouse stock"`. Also add `@@check` constraint or application validation in replenish route.
**Warning signs:** Negative warehouse_qty values after replenishment operations.

### Pitfall 6: Cashier Layout Missing Auth Provider
**What goes wrong:** The `app/cashier/pos/page.tsx` is a standalone page without the admin layout. The `LogoutButton` component is already there, but the `ToastProvider` and auth state might not be available.
**Why it happens:** Admin pages inherit `app/admin/layout.tsx` which wraps with `ToastProvider`. Cashier has no dedicated layout.
**How to avoid:** Create `app/cashier/layout.tsx` wrapping cashier pages with `ToastProvider`. Check middleware.ts to verify it protects `/cashier/*` routes.
**Warning signs:** `useToast` hook failing; cashier seeing login page after accessing `/cashier/pos` directly.

### Pitfall 7: Salesperson Picker Showing All Users
**What goes wrong:** D-10 requires salesperson picker shows ONLY CASHIER-role users. If the endpoint returns all active users, Finance and Superadmin would appear as selectable salespeople.
**Why it happens:** Using the existing `/api/users` endpoint which returns all users.
**How to avoid:** Create dedicated `/api/cashier/staff` endpoint that filters: `prisma.user.findMany({ where: { isActive: true, role: { name: 'CASHIER' } } })`.
**Warning signs:** Finance users appearing in the salesperson dropdown.

---

## Code Examples

### Prisma Schema Extension (Sale/SaleItem Models)

```prisma
// Source: [VERIFIED: existing schema.prisma + Prisma docs /prisma/prisma]
// Add to Product model:
model Product {
  id           String   @id @default(cuid())
  name         String
  sku          String   @unique
  category     String?
  sellingPrice Decimal  @map("selling_price") @db.Decimal(10, 2)
  cost         Decimal  @db.Decimal(10, 2)
  storeQty     Int      @default(0) @map("store_qty")
  warehouseQty Int      @default(0) @map("warehouse_qty")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedBy    String?  @map("updated_by")

  saleItems SaleItem[]

  @@index([sku])
  @@index([name])
  @@map("products")
}

// New models:
model Sale {
  id            String      @id @default(cuid())
  cashierId     String      @map("cashier_id")
  cashier       User        @relation("CashierSales", fields: [cashierId], references: [id])
  salespersonId String      @map("salesperson_id")
  salesperson   User        @relation("SalespersonSales", fields: [salespersonId], references: [id])
  paymentMethod String      @map("payment_method") // CASH | CARD | TRANSFER
  total         Decimal     @db.Decimal(10, 2)
  itemCount     Int         @map("item_count")
  createdAt     DateTime    @default(now()) @map("created_at")

  items         SaleItem[]

  @@index([cashierId])
  @@index([salespersonId])
  @@index([createdAt])
  @@map("sales")
}

model SaleItem {
  id         String   @id @default(cuid())
  saleId     String   @map("sale_id")
  sale       Sale     @relation(fields: [saleId], references: [id])
  productId  String   @map("product_id")
  product    Product  @relation(fields: [productId], references: [id])
  quantity   Int
  unitPrice  Decimal  @map("unit_price") @db.Decimal(10, 2)   // snapshot
  unitCost   Decimal  @map("unit_cost") @db.Decimal(10, 2)    // snapshot
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([saleId])
  @@index([productId])
  @@map("sale_items")
}
```

**User model relation update required:** The existing `User` model must have two new relation references: `cashierSales Sale[] @relation("CashierSales")` and `salespersonSales Sale[] @relation("SalespersonSales")`.

### Database CHECK Constraint Migration (store_qty >= 0)

```sql
-- Source: [ASSUMED - standard PostgreSQL CHECK constraint syntax]
-- Add in a new migration file after schema migration:
ALTER TABLE products ADD CONSTRAINT store_qty_non_negative CHECK (store_qty >= 0);
ALTER TABLE products ADD CONSTRAINT warehouse_qty_non_negative CHECK (warehouse_qty >= 0);
```

This is added as raw SQL in a Prisma migration. Prisma does not support `@@check` constraints in schema.prisma directly (they require `@@ignore` or custom migration SQL).

### AuditLog Metadata Migration

```sql
-- Source: [VERIFIED: existing migration pattern in codebase]
-- Add metadata column to audit_log:
ALTER TABLE audit_log ADD COLUMN metadata JSONB;
```

### Product Search API Route

```typescript
// Source: [VERIFIED: existing route.ts patterns in codebase]
// GET /api/cashier/products?search=...
export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['CASHIER', 'SUPERADMIN'])(request as AuthenticatedRequest)
  if (rbacResult) return rbacResult

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim()

  const prisma = (await import('@/lib/db')).default

  const products = await prisma.product.findMany({
    where: search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { equals: search } }, // exact match for barcode scan
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
    take: 20, // limit results for POS performance
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(products)
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate Inventory table | `store_qty`/`warehouse_qty` on Product model | D-05 (this phase) | Simpler for Phase 2; no join needed for stock check |
| No price on SaleItem | Price snapshot on SaleItem at time of sale | D-06 (this phase) | Historical margin accuracy for Phase 3 reporting |
| Generic `logAction` (4 params) | Extended `logAction` with metadata (5 params) | This phase | Enables before/after quantities for AUDIT-02 |
| Product model without pricing | Product with `sellingPrice`, `cost` fields | This phase (D-04) | Enables PROD-02 cost of goods and Phase 3 margins |

**Deprecated/outdated:**
- The existing product creation form in `app/admin/products/page.tsx` does not collect `sellingPrice` or `cost`. Phase 2 must update this form to include both fields (PROD-02 requirement). The backend `POST /api/products` route schema also needs updating.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SALE-04 "calculates tax" will be implemented as subtotal-only (no tax config exists) | Phase Requirements table, SALE-04 | If tax is required, a tax rate configuration mechanism is needed; planner should flag for user |
| A2 | `$queryRaw` with `ANY(${ids}::text[])` syntax works with Prisma 6.19 + PostgreSQL CUID strings | Pattern 1 code example | If array syntax differs, use individual SELECT FOR UPDATE per product in a loop |
| A3 | The CHECK constraint (`store_qty >= 0`) is added via raw SQL in a migration, not in schema.prisma | Code Examples section | Prisma 7+ may support `@@check` directly — verify before migration authoring |
| A4 | The cashier app needs a new `app/cashier/layout.tsx` with ToastProvider | Pitfall 6 | middleware.ts may already handle auth; only ToastProvider is missing |
| A5 | `Decimal` type values from `$queryRaw` return as JS `number`, not `Prisma.Decimal` | Pattern 1, Pitfall 4 | If Prisma returns Decimal objects from raw queries, arithmetic code needs adjustment |

---

## Open Questions

1. **SALE-04 Tax Calculation**
   - What we know: REQUIREMENTS.md SALE-04 says "calculates subtotal, tax, and total automatically"
   - What's unclear: No tax rate is defined anywhere in the project. Indonesia PPN is 11% but this is internal ops tooling — unclear if tax applies
   - Recommendation: Implement as subtotal = total (no tax), add a comment. Flag for user confirmation in plan.

2. **Product Model Migration — Existing Products**
   - What we know: Phase 1 created products without sellingPrice/cost. New fields D-04 are "required fields."
   - What's unclear: If sellingPrice/cost are required (NOT NULL), existing products will fail migration unless a default or data migration is provided.
   - Recommendation: Migration should use `@default(0)` for both fields (or `DEFAULT 0.00`), then a data migration step prompts superadmin to fill in real prices.

3. **middleware.ts — Does it protect /cashier routes?**
   - What we know: `middleware.ts` protects `/admin` routes; cashier routes visible in `app/cashier/`
   - What's unclear: Whether `middleware.ts` was extended to protect `/cashier/*` in Phase 1
   - Recommendation: Read `middleware.ts` before planning cashier layout task; add `/cashier` protection if missing.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Prisma transactions, CHECK constraints | Needs runtime check | 16+ (from docker-compose.yml) | — |
| Node.js | Next.js server | Assumed available | 22 LTS (from CLAUDE.md) | — |
| Prisma CLI | Schema migration | ✓ | 6.19.3 | — |
| Docker | Local PostgreSQL | ✓ | docker-compose.yml present | — |

**Missing dependencies with no fallback:** None identified.

**Step 2.6: Environment audit partial** — PostgreSQL availability depends on Docker being running. The planner should include a Wave 0 step to verify `docker compose up -d` starts successfully before migration tasks.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vitest.config.ts` (exists, configured) |
| Quick run command | `npm test` |
| Full suite command | `npm run test:coverage` |
| Environment | `node` (not jsdom — API route tests run in Node) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INV-04/SALE-08 | Atomic transaction: sale + inventory decrement both succeed or both fail | unit | `npm test -- __tests__/unit/sales.test.ts` | ❌ Wave 0 |
| INV-04/SALE-08 | Concurrent sale: two cashiers sell last unit — only one succeeds | integration | `npm test -- __tests__/integration/concurrent-sale.test.ts` | ❌ Wave 0 |
| SALE-08 | store_qty never goes negative after failed transaction | unit | `npm test -- __tests__/unit/inventory.test.ts` | ❌ Wave 0 |
| D-15 | Reject sale if store_qty < requested quantity | unit | `npm test -- __tests__/unit/sales.test.ts` | ❌ Wave 0 |
| SALE-06/D-09 | Checkout rejected if salespersonId missing | integration | `npm test -- __tests__/endpoints/sales.test.ts` | ❌ Wave 0 |
| D-10 | Salesperson picker only shows CASHIER-role users | integration | `npm test -- __tests__/endpoints/cashier-staff.test.ts` | ❌ Wave 0 |
| D-06 | SaleItem unit_price/unit_cost captured from DB, not request body | unit | `npm test -- __tests__/unit/sales.test.ts` | ❌ Wave 0 |
| INV-05/D-13 | Replenishment: warehouse_qty decrements, store_qty increments atomically | unit | `npm test -- __tests__/unit/inventory.test.ts` | ❌ Wave 0 |
| AUDIT-02 | Replenishment audit entry includes before/after quantities | unit | `npm test -- __tests__/unit/audit.test.ts` | ❌ Wave 0 |
| D-17 | SALE_CREATE, INVENTORY_REPLENISH appear in logAction calls | unit | `npm test -- __tests__/unit/audit.test.ts` | ❌ Wave 0 |
| RBAC | POST /api/cashier/sales rejects FINANCE role with 403 | integration | `npm test -- __tests__/endpoints/sales.test.ts` | ❌ Wave 0 |
| RBAC | POST /api/admin/inventory/replenish rejects CASHIER role with 403 | integration | `npm test -- __tests__/endpoints/inventory.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test` (full Vitest suite — currently fast at 146 tests, will grow)
- **Per wave merge:** `npm run test:coverage`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `__tests__/unit/sales.test.ts` — atomic transaction logic, price snapshot, stock validation (INV-04, SALE-08, D-06, D-15)
- [ ] `__tests__/unit/inventory.test.ts` — replenishment logic, non-negative constraint (INV-05, SALE-08)
- [ ] `__tests__/unit/audit.test.ts` — extended logAction with metadata, new action types (AUDIT-02, D-17)
- [ ] `__tests__/endpoints/sales.test.ts` — POST /api/cashier/sales contract tests (RBAC, validation, response shape)
- [ ] `__tests__/endpoints/inventory.test.ts` — GET/POST inventory endpoints (RBAC, replenishment)
- [ ] `__tests__/endpoints/cashier-staff.test.ts` — GET /api/cashier/staff CASHIER-only filter (D-10)
- [ ] `__tests__/integration/concurrent-sale.test.ts` — Two simultaneous sales of last unit (critical race condition test)

**Note on concurrent sale test:** This test requires actual database access (cannot be mocked). It will need a test PostgreSQL instance. The existing test setup uses mocked contracts. Recommend adding a separate `test:integration` script in package.json that requires `DATABASE_URL` to be set, following the existing Vitest pattern but with a real DB fixture.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (carry-forward) | JWT Bearer token via `authMiddleware` (Phase 1) |
| V3 Session Management | yes (carry-forward) | HttpOnly refresh token cookie (Phase 1) |
| V4 Access Control | yes | `rbacMiddleware(['CASHIER','SUPERADMIN'])` on cashier routes; `rbacMiddleware(['SUPERADMIN'])` on replenishment |
| V5 Input Validation | yes | Zod schema on all POST endpoints (checkout, replenishment) |
| V6 Cryptography | no | No new cryptographic operations in Phase 2 |

### Known Threat Patterns for POS Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Price manipulation (client sends lower price) | Tampering | Server reads price from locked DB row, never from request body (D-06 + Pattern 1) |
| Salesperson identity spoofing (invalid salespersonId) | Spoofing | Validate `salespersonId` exists AND has CASHIER role before committing |
| Inventory negative exploit (concurrent sales) | Tampering | `SELECT ... FOR UPDATE` inside transaction prevents concurrent decrement |
| RBAC bypass on cashier routes | Elevation of Privilege | `rbacMiddleware` applied before ANY business logic (existing pattern) |
| Audit trail poisoning | Repudiation | AuditLog is immutable (Phase 1 trigger prevents UPDATE/DELETE) |
| Replenishment without warehouse stock | Tampering | Application-layer `warehouse_qty >= quantity` check before update |

---

## Sources

### Primary (HIGH confidence)
- `/prisma/prisma` (Context7) — interactive transactions, `$queryRaw`, `$executeRaw`, isolation levels
- `/prisma/web` (Context7) — `$transaction` callback pattern, `SELECT ... FOR UPDATE` via raw queries, Prisma.TransactionIsolationLevel options
- `/tanstack/query` (Context7) — `useQuery`/`useMutation` patterns (referenced but not used — confirmed not installed)
- Codebase: `prisma/schema.prisma` — verified existing Product model fields (missing sellingPrice, cost, storeQty, warehouseQty)
- Codebase: `lib/audit/logger.ts` — verified logAction signature and missing metadata field
- Codebase: `middleware/auth.ts`, `middleware/rbac.ts` — verified middleware function signatures
- Codebase: `package.json` — verified all installed package versions
- Codebase: `app/api/products/route.ts` — verified API route pattern (authMiddleware + rbacMiddleware + Zod)

### Secondary (MEDIUM confidence)
- Codebase: `app/admin/products/page.tsx`, `app/admin/users/page.tsx` — verified UI patterns (useState, useEffect, fetch, localStorage token)
- `.planning/phases/01-foundation/01-CONTEXT.md` — verified Phase 1 RBAC decisions, audit log schema, Prisma patterns

### Tertiary (LOW confidence)
- A2: `ANY(${ids}::text[])` PostgreSQL array syntax in Prisma `$queryRaw` — standard PostgreSQL syntax but not verified with a running instance in this session
- A3: CHECK constraint via migration SQL (not Prisma schema) — standard practice but Prisma version support for `@@check` not verified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json; no new installations needed
- Architecture: HIGH — transaction pattern verified in Prisma docs; existing codebase patterns verified
- Pitfalls: HIGH — race condition (TOCTOU) is well-documented; schema gaps (missing AuditLog metadata) verified by reading actual schema
- Schema extension: HIGH — existing schema read directly; new fields follow Prisma documented conventions
- Concurrent sale test: MEDIUM — pattern is standard but implementation requires real DB; not tested in session

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (30-day window; Prisma 6.x is stable, stack is established)
