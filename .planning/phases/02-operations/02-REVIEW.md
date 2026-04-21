---
phase: 02-operations
reviewed: 2026-04-21T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - app/api/admin/inventory/replenish/route.ts
  - app/api/admin/inventory/route.ts
  - lib/audit/logger.ts
  - middleware.ts
  - prisma/schema.prisma
  - __tests__/endpoints/cashier-staff.test.ts
  - __tests__/endpoints/inventory.test.ts
  - __tests__/endpoints/sales.test.ts
  - __tests__/integration/concurrent-sale.test.ts
  - __tests__/unit/audit.test.ts
  - __tests__/unit/inventory.test.ts
  - __tests__/unit/sales.test.ts
findings:
  critical: 2
  warning: 3
  info: 3
  total: 8
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-21T00:00:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Reviewed the Phase 02 operations surface: two admin inventory API routes (`/api/admin/inventory` GET and `/api/admin/inventory/replenish` POST), the audit logger, Next.js middleware, Prisma schema, and the full test suite. The inventory replenishment logic is well-structured with a proper `$transaction` block and before/after audit capture. The schema is clean and well-indexed.

Two critical issues were identified: (1) the `logAction` audit call is placed outside the database transaction, creating a window where the inventory update commits but the audit record silently fails; (2) the FINANCE role has no middleware route guard, so finance users can access any page not protected by per-route RBAC. Three warnings cover a TOCTOU concurrency gap in the warehouse stock check, an unhandled `logAction` rejection that masks partial failures, and the structural-only test suite that exercises no actual handler code. Three info items cover a missing `updatedAt` field on `Product`, stray `console.error` calls, and a non-null assertion on `req.user`.

---

## Critical Issues

### CR-01: Audit log written outside transaction — silent audit loss on inventory commit

**File:** `app/api/admin/inventory/replenish/route.ts:62-79`
**Issue:** `logAction(...)` is called after `prisma.$transaction(...)` resolves, outside any transaction scope. If the `auditLog.create` write fails (DB connection drop, constraint violation, disk full), the inventory transfer has already committed with no audit record. A compliance-oriented system that bills itself as maintaining an immutable audit trail cannot allow silent audit loss on state-changing operations.

**Fix:** Move the audit log write inside the transaction so it commits atomically with the inventory update:

```typescript
const result = await prisma.$transaction(async (tx) => {
  const product = await tx.product.findUnique({ where: { id: productId } })
  if (!product) throw new Error('PRODUCT_NOT_FOUND')

  if (product.warehouseQty < quantity) {
    throw new Error(`Insufficient warehouse stock. Only ${product.warehouseQty} available.`)
  }

  const updated = await tx.product.update({
    where: { id: productId },
    data: {
      storeQty: { increment: quantity },
      warehouseQty: { decrement: quantity },
    },
  })

  // Inside transaction — rolls back together if audit write fails
  await tx.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'INVENTORY_REPLENISH',
      entityType: 'PRODUCT',
      entityId: productId,
      metadata: {
        qty_moved: quantity,
        reason,
        before: { storeQty: product.storeQty, warehouseQty: product.warehouseQty },
        after: { storeQty: updated.storeQty, warehouseQty: updated.warehouseQty },
      },
    },
  })

  return { product, updated }
})
```

---

### CR-02: FINANCE role has no middleware route guard — unprotected page access

**File:** `middleware.ts:1-51`
**Issue:** The middleware defines route guards only for `/admin/:path*` (SUPERADMIN) and `/cashier/:path*` (CASHIER or SUPERADMIN). There is no guard for any finance-facing routes (e.g., `/finance/:path*`). A FINANCE-role user — or any authenticated or unauthenticated user — can navigate to finance pages without being challenged at the middleware layer. Protection then depends entirely on per-route RBAC middleware, meaning any finance route that omits the RBAC check is fully open.

**Fix:** Add a FINANCE route guard and update the matcher config:

```typescript
if (pathname.startsWith('/finance')) {
  const token = request.cookies.get('access_token')?.value
  if (!token) return NextResponse.redirect(new URL('/login', request.url))

  try {
    const payload = verifyAccessToken(token)
    if (!['FINANCE', 'SUPERADMIN'].includes(payload.role)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

```typescript
export const config = {
  matcher: ['/admin/:path*', '/cashier/:path*', '/finance/:path*'],
}
```

---

## Warnings

### WR-01: TOCTOU gap — warehouse stock check is not serialized against concurrent replenishment

**File:** `app/api/admin/inventory/replenish/route.ts:39-56`
**Issue:** The warehouse stock check reads `product.warehouseQty` with a plain `findUnique` (no `SELECT FOR UPDATE`). Prisma interactive transactions use `READ COMMITTED` isolation in PostgreSQL by default. Two concurrent replenishment requests can both read `warehouseQty = 10`, both pass the `>= quantity` guard for quantity 10, and both issue a `decrement` — leaving `warehouseQty = -10`. The Prisma `decrement` itself is atomic, but the read-then-validate pattern before it is not serialized.

**Fix:** Lock the row before reading inside the transaction, or add a database-level CHECK constraint as a safety net:

```typescript
// Option A: row-level lock inside transaction
const [lockedProduct] = await tx.$queryRaw<Array<{ id: string; warehouseQty: number; storeQty: number }>>`
  SELECT id, warehouse_qty AS "warehouseQty", store_qty AS "storeQty"
  FROM products WHERE id = ${productId} FOR UPDATE
`
if (!lockedProduct) throw new Error('PRODUCT_NOT_FOUND')
if (lockedProduct.warehouseQty < quantity) {
  throw new Error(`Insufficient warehouse stock. Only ${lockedProduct.warehouseQty} available.`)
}

// Option B: add a migration with CHECK constraint as a last-resort guard
-- ALTER TABLE products ADD CONSTRAINT warehouse_qty_non_negative CHECK (warehouse_qty >= 0);
```

---

### WR-02: `logAction` rejection propagates into the wrong catch branch — masks replenishment success

**File:** `app/api/admin/inventory/replenish/route.ts:62`
**Issue:** The `await logAction(...)` call (current placement, outside the transaction) is not wrapped in its own try/catch. If `logAction` throws, the error propagates to the outer catch at line 89. At that point the inventory update has already committed successfully. The handler will return a 500 response, causing the caller to believe the replenishment failed when it actually succeeded. This silently corrupts the caller's state.

**Fix:** Wrap `logAction` in its own try/catch so inventory success and audit success are handled independently (pending resolution of CR-01):

```typescript
try {
  await logAction(req.user!.userId, 'INVENTORY_REPLENISH', 'PRODUCT', productId, { ... })
} catch (auditError) {
  console.error('Audit log failed for replenishment:', productId, auditError)
  // Do not re-throw — inventory committed successfully; audit failure is a secondary concern
}
```

---

### WR-03: Endpoint tests are structural assertions only — no handler code is exercised

**File:** `__tests__/endpoints/cashier-staff.test.ts`, `__tests__/endpoints/inventory.test.ts`, `__tests__/endpoints/sales.test.ts`
**Issue:** Every endpoint test constructs a hardcoded response object literal and asserts on it (e.g., `const response = { status: 403, body: { error: 'Insufficient permissions' } }; expect(response.status).toBe(403)`). No actual route handler is called, no Prisma is mocked, no HTTP request is made. These tests cannot catch regressions in `replenish/route.ts` or `inventory/route.ts`. The suite gives a misleading impression of coverage. This is particularly notable since the concurrent-sale integration tests (correctly marked `it.todo`) demonstrate that the team knows how to write real integration tests.

**Fix:** Use `next-test-api-route-handler` (or import route handler functions directly and call them with a mocked `NextRequest`) combined with Vitest's module mocking for Prisma:

```typescript
import { POST } from '@/app/api/admin/inventory/replenish/route'
import { vi } from 'vitest'

vi.mock('@/lib/db', () => ({ default: { $transaction: vi.fn(), product: { findUnique: vi.fn() } } }))

it('returns 400 when warehouse stock insufficient', async () => {
  const req = new Request('http://localhost/api/admin/inventory/replenish', {
    method: 'POST',
    body: JSON.stringify({ productId: 'p1', quantity: 100, reason: 'restock' }),
  })
  const res = await POST(req as any)
  expect(res.status).toBe(400)
})
```

---

## Info

### IN-01: `Product` schema is missing `updatedAt` — no modification timestamp on inventory records

**File:** `prisma/schema.prisma:79-96`
**Issue:** The `Product` model has `createdAt` and the manual `updatedBy` string field, but no `updatedAt DateTime @updatedAt`. Inventory replenishment updates `storeQty` and `warehouseQty` without recording when. For financial reporting and audit purposes, knowing when a product record was last modified is valuable independently of the `AuditLog` table.

**Fix:**
```prisma
model Product {
  // ...
  updatedAt    DateTime  @updatedAt @map("updated_at")
  updatedBy    String?   @map("updated_by")
}
```

---

### IN-02: `console.error` used in production route handlers

**File:** `app/api/admin/inventory/replenish/route.ts:97`, `app/api/admin/inventory/route.ts:32`
**Issue:** Both routes use `console.error` directly. The project's CLAUDE.md recommends `winston` or `pino` for structured logging with severity metadata and log correlation. Raw `console.error` lacks request IDs and structured output needed for log aggregation in production.

**Fix:** Replace with the project's structured logger when implemented. At minimum, add a request identifier to error output for correlation.

---

### IN-03: Non-null assertion `req.user!.userId` lacks an explicit guard

**File:** `app/api/admin/inventory/replenish/route.ts:63`
**Issue:** `req.user!.userId` uses TypeScript's non-null assertion operator. The `user` property is populated by `authMiddleware` — if that middleware is ever refactored or bypassed in a test context, this will throw at runtime with an unhelpful `TypeError: Cannot read properties of undefined`. The assertion suppresses the compiler check that would otherwise surface this.

**Fix:** Add an explicit guard before the audit call:

```typescript
if (!req.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// req.user is now safely narrowed — no assertion needed
await logAction(req.user.userId, ...)
```

---

_Reviewed: 2026-04-21T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
