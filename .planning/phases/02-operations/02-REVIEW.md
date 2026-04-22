---
phase: 02-operations
reviewed: 2026-04-22T00:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - __tests__/endpoints/cashier-staff.test.ts
  - __tests__/endpoints/inventory.test.ts
  - __tests__/endpoints/sales.test.ts
  - __tests__/integration/concurrent-sale.test.ts
  - __tests__/unit/audit.test.ts
  - __tests__/unit/inventory.test.ts
  - __tests__/unit/sales.test.ts
  - app/api/admin/inventory/replenish/route.ts
  - app/api/admin/inventory/route.ts
  - app/api/cashier/products/route.ts
  - app/api/cashier/sales/route.ts
  - app/api/cashier/staff/route.ts
  - app/admin/inventory/page.tsx
  - app/cashier/layout.tsx
  - app/cashier/pos/page.tsx
  - components/CashierNav.tsx
  - lib/audit/logger.ts
  - middleware.ts
  - prisma/schema.prisma
findings:
  critical: 3
  warning: 5
  info: 4
  total: 12
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-22T00:00:00Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Reviewed the full operations layer: API routes for inventory and cashier sales, middleware, frontend POS and inventory pages, audit logger, and the Prisma schema. The transaction design for checkout and replenishment is architecturally sound — both use `SELECT FOR UPDATE` inside a Prisma `$transaction`, prices are read from locked DB rows (never from the request body), and audit logging is in place.

Three critical issues were found: (1) the audit log for sales is written outside the transaction, creating a window where a sale commits but leaves no audit trail; (2) the cashier products API exposes the `cost` field, leaking margin data to a role that should not see it; (3) the JWT secret falls back to a hardcoded string, meaning a missing env var silently accepts forged tokens in production. Five warnings cover a concurrency gap in the warehouse stock check, an amountReceived validation gap, stale-stock UX, an unguarded non-null assertion, and missing database-level non-negative constraints. Four info items address test quality, a stale comment, and dead code.

---

## Critical Issues

### CR-01: Audit log for SALE_CREATE written outside the transaction

**File:** `app/api/cashier/sales/route.ts:124-130`
**Issue:** `logAction(...)` is called after `prisma.$transaction(...)` resolves (line 124), outside the transaction scope. If the process crashes, the network drops, or the `auditLog.create` insert fails for any reason, the sale is committed to the database with no audit record. The compliance requirement for an immutable audit trail is silently broken. If `logAction` throws, the outer catch returns a 500 — making the caller believe the checkout failed when the sale actually committed, which can cause duplicate retry submissions.

**Fix:** Move `auditLog.create` inside the `$transaction` block so it rolls back atomically with the sale if it fails:

```typescript
// Inside prisma.$transaction(async (tx) => { ... })
// After Step 6 (inventory decrement):
await tx.auditLog.create({
  data: {
    userId: cashierId,
    action: 'SALE_CREATE',
    entityType: 'SALE',
    entityId: newSale.id,
    metadata: {
      cashierId,
      salespersonId,
      total,
      paymentMethod,
      itemCount: items.length,
    },
  },
})
return newSale
```

---

### CR-02: `cost` field exposed to CASHIER role via products endpoint

**File:** `app/api/cashier/products/route.ts:29-37`
**Issue:** The `select` block includes `cost: true`. Cost (unit purchase price) is gross-margin-sensitive data. Returning it to the CASHIER role exposes margin information for every product to every cashier. The `Product` interface in `app/cashier/pos/page.tsx` (line 22) also includes `cost`, and the field is passed through in the search result but never rendered — confirming it is unintentional.

**Fix:** Remove `cost` from the cashier products select:

```typescript
select: {
  id: true,
  name: true,
  sku: true,
  sellingPrice: true,
  // cost: true  <-- remove
  storeQty: true,
  warehouseQty: true,
},
```

Also remove `cost` from the `Product` interface in `app/cashier/pos/page.tsx` line 22.

---

### CR-03: Hardcoded JWT secret fallback — forged tokens accepted if env var is unset

**File:** `middleware.ts:4-6`
**Issue:** The JWT secret falls back to `'dev-secret-change-in-production'` when `JWT_SECRET` is absent. If the env var is accidentally unset in production (e.g., a deployment misconfiguration), the application silently continues accepting tokens. Anyone who reads this source code can forge valid tokens for any role, including SUPERADMIN.

**Fix:** Fail closed — throw at startup if the secret is absent:

```typescript
const rawSecret = process.env.JWT_SECRET
if (!rawSecret) {
  throw new Error('JWT_SECRET environment variable must be set')
}
const JWT_SECRET = new TextEncoder().encode(rawSecret)
```

Next.js middleware runs at the edge; a thrown error here surfaces as a 500 during initialization, making the misconfiguration immediately visible rather than silently exploitable.

---

## Warnings

### WR-01: TOCTOU gap — warehouse stock check not serialized against concurrent replenishment

**File:** `app/api/admin/inventory/replenish/route.ts:39-56`
**Issue:** The current implementation uses `$queryRaw` with `SELECT ... FOR UPDATE` (line 39), which is correct. However, the validation on line 47 compares the locked `warehouse_qty` to the requested `quantity`. The issue is that Prisma's `$queryRaw` returns `DECIMAL`/`NUMERIC` columns as strings on some driver versions. The type annotation declares `warehouse_qty: number`, but if the driver ever returns a string, `"10" < 20` evaluates unexpectedly via JavaScript type coercion. This is currently safe because `warehouse_qty` is an `INT` column, but the pattern is fragile. More critically, if a future schema change makes it a DECIMAL, the guard silently breaks.

**Fix:** Explicitly coerce the value before comparison:

```typescript
if (Number(product.warehouseQty) < quantity) {
  throw new Error(`Insufficient warehouse stock. Only ${product.warehouseQty} available.`)
}
```

---

### WR-02: `amountReceived` not validated against actual total server-side

**File:** `app/api/cashier/sales/route.ts:17-22`
**Issue:** The Zod schema validates `amountReceived` only as `z.number().positive()`. A CASH payment where `amountReceived = 0.01` and `total = 500` passes schema validation. The server then returns `changeDue = -499.99`. The frontend guards against this (`parsedAmountReceived >= total` at line 154), but the API has no server-side enforcement of this business rule. A client that bypasses the frontend can submit an underpaid cash transaction successfully.

**Fix:** After computing `total` inside the transaction, validate `amountReceived >= total` before creating the sale:

```typescript
// Inside the transaction, after Step 3 (total calculation):
if (paymentMethod === 'CASH' && amountReceived !== undefined && amountReceived < total) {
  throw new Error('Amount received is less than the total')
}
```

Handle the new error string in the outer catch block to return a 400.

---

### WR-03: Cart `storeQty` snapshot goes stale — misleading UX for concurrent sales

**File:** `app/cashier/pos/page.tsx:124`, `app/cashier/pos/page.tsx:349`
**Issue:** When a product is added to the cart, `storeQty` is snapshotted from the search result at that moment (line 124). The `+` quantity button is disabled at `item.quantity >= item.storeQty` (line 349), using this stale value. If another cashier sells units of the same product after the first cashier's search, the first cashier's cart shows a higher available quantity than actually exists. The server correctly rejects the checkout, but the cashier sees a confusing error mid-transaction rather than an early warning.

**Fix:** Either (a) re-fetch the product's current `storeQty` on each quantity increment, or (b) show a timestamp and "prices and stock may have changed" notice on the cart after N seconds of inactivity.

---

### WR-04: Non-null assertion `req.user!.userId` without explicit guard

**File:** `app/api/admin/inventory/replenish/route.ts:64`, `app/api/cashier/sales/route.ts:47`
**Issue:** Both routes use `req.user!.userId` after `authMiddleware` returns. The `!` assertion suppresses the TypeScript check. If `authMiddleware` is refactored, bypassed in a test, or fails to attach the user for any reason, this throws a runtime `TypeError: Cannot read properties of undefined` rather than returning a clean 401.

**Fix:** Add an explicit narrowing guard immediately after auth:

```typescript
const req = request as AuthenticatedRequest
if (!req.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// req.user is now narrowed — no assertion needed
const cashierId = req.user.userId
```

---

### WR-05: No database-level non-negative constraint on stock quantities

**File:** `prisma/schema.prisma:88-89`
**Issue:** `storeQty` and `warehouseQty` are plain `Int` fields with no `CHECK` constraint. The application guards against negative stock inside transactions, but there is no database-level safety net. A direct SQL update, a future migration bug, or a Prisma `updateMany` outside the guarded path could produce negative stock without any error.

**Fix:** Add constraints via a raw migration (Prisma schema DSL does not support `CHECK`):

```sql
ALTER TABLE products
  ADD CONSTRAINT chk_store_qty_non_negative CHECK (store_qty >= 0),
  ADD CONSTRAINT chk_warehouse_qty_non_negative CHECK (warehouse_qty >= 0);
```

---

## Info

### IN-01: Endpoint tests assert on hardcoded literal objects — no route code is executed

**File:** `__tests__/endpoints/cashier-staff.test.ts`, `__tests__/endpoints/inventory.test.ts`, `__tests__/endpoints/sales.test.ts`
**Issue:** Every "endpoint" test constructs a hardcoded response literal and asserts on it (e.g., `const response = { status: 403 }; expect(response.status).toBe(403)`). No route handler is imported or called. These tests cannot catch regressions in the actual implementation. An RBAC bypass or a broken validation in a real route would not be detected.

**Fix:** Import route handlers directly and call them with a mocked `NextRequest`, combined with Vitest module mocking for Prisma. The `__tests__/unit/` tests show the right pattern for isolated logic; endpoint tests should also exercise the real handler code.

---

### IN-02: `INVENTORY_UPDATE` in audit logger comment does not match emitted action

**File:** `lib/audit/logger.ts:8`
**Issue:** The registered action types comment lists `INVENTORY_UPDATE`, but the replenish route emits `INVENTORY_REPLENISH` (replenish route, line 65). The comment is stale and may mislead developers searching for which action to use.

**Fix:** Update the comment:

```typescript
// SALE_CREATE, INVENTORY_REPLENISH
```

---

### IN-03: `warehouseQty` rendered in cashier POS search results — confirm intent

**File:** `app/cashier/pos/page.tsx:305-306`
**Issue:** The POS search results render `WH: {product.warehouseQty}` (warehouse quantity) to the cashier. CLAUDE.md states cashiers can check "store vs warehouse" stock, so this may be intentional. If confirmed, no change is needed. If warehouse stock is internal-only, remove from both the API select and the POS render.

**Fix:** Confirm with stakeholders. No code change needed if the current behaviour is intentional.

---

### IN-04: `cost` field in `Product` interface is dead code in the POS page

**File:** `app/cashier/pos/page.tsx:22`
**Issue:** The `Product` interface includes `cost: number` (line 22), but `cost` is never read, stored in the cart, or rendered anywhere in the component. This is dead code that will be automatically resolved when CR-02 is fixed (cost removed from the API response). Noting here for traceability.

**Fix:** Remove `cost` from the `Product` interface in this file as part of the CR-02 fix.

---

_Reviewed: 2026-04-22T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
