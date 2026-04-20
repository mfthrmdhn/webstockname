---
phase: 02-operations
reviewed: 2026-04-20T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - prisma/schema.prisma
  - lib/audit/logger.ts
  - lib/db.ts
  - middleware.ts
  - app/cashier/layout.tsx
  - app/cashier/pos/page.tsx
  - app/admin/inventory/page.tsx
  - components/AdminNav.tsx
  - app/admin/products/page.tsx
  - app/api/products/route.ts
findings:
  critical: 2
  warning: 5
  info: 4
  total: 11
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-20
**Depth:** standard
**Files Reviewed:** 9 (5 of 14 listed files do not exist yet — see note below)
**Status:** issues_found

## Scope Note

Five files listed in scope do not exist and were not reviewed:
- `app/api/cashier/products/route.ts`
- `app/api/cashier/staff/route.ts`
- `app/api/cashier/sales/route.ts`
- `app/api/admin/inventory/route.ts`
- `app/api/admin/inventory/replenish/route.ts`

These are Phase 2 API routes that have not been created yet. The POS page (`app/cashier/pos/page.tsx`) and inventory page (`app/admin/inventory/page.tsx`) both call these endpoints, meaning the frontend is built against APIs that do not exist. This is likely intentional (UI-first development), but the missing routes represent a gap that must be filled for the system to function. Issues related to those contracts are flagged below.

---

## Summary

Nine source files were reviewed. The existing files cover the Prisma schema, audit logger, JWT middleware, cashier POS UI, admin inventory UI, admin products UI, navigation, and the products API route. The most significant issues are: (1) the cashier `/pos` route has no authentication guard in `middleware.ts`, allowing unauthenticated access, and (2) the POS page performs client-side stock quantity enforcement but the backend APIs that enforce it do not exist yet, creating a trust boundary gap. Several secondary issues exist around token storage, authorization checks in API routes, and type safety.

---

## Critical Issues

### CR-01: Cashier POS route is unauthenticated — middleware only protects `/admin`

**File:** `middleware.ts:8`
**Issue:** The middleware only adds auth guards for paths starting with `/admin`. The cashier POS at `/cashier/*` has no protection. Any unauthenticated user can access the cashier POS in the browser. The `pos/page.tsx` does call `getAccessToken()` before each fetch, but there is no server-side redirect enforcing authentication — a user who loads the page without a token will simply see an empty staff list and search results, with no redirect to login.
**Fix:**
```typescript
if (pathname.startsWith('/admin')) {
  // existing SUPERADMIN check
}

if (pathname.startsWith('/cashier')) {
  const token = request.cookies.get('access_token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  try {
    const payload = verifyAccessToken(token)
    // Optionally check payload.role === 'CASHIER' or any authenticated user
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```
Also update the matcher:
```typescript
export const config = {
  matcher: ['/admin/:path*', '/cashier/:path*'],
}
```

### CR-02: `app/api/products` GET endpoint has no role-based authorization — exposes cost data risk

**File:** `app/api/products/route.ts:97-138`
**Issue:** The GET handler authenticates (requires a valid JWT) but does not restrict by role. Any authenticated user — including cashiers — can call `GET /api/products`. While the current response shape omits `cost` and `sellingPrice` (returns only `id, name, sku, category, createdAt`), the `where: any` typed filter on line 108 accepts arbitrary query params. More importantly, the absence of role enforcement here is inconsistent with the POST handler (which correctly requires `SUPERADMIN`), and if the select clause is ever extended (e.g., to add price for a different use case), cost data would leak to cashier-role users. The pattern should be made explicit.
**Fix:** Add an explicit role check or at minimum add a type-safe where clause. If this endpoint is intended to be accessible to all authenticated roles, document it explicitly:
```typescript
// Acceptable roles: SUPERADMIN, FINANCE, CASHIER (read-only product catalog)
// Cost and price fields intentionally excluded from response

// Replace `const where: any = {}` with:
const where: { category?: string; sku?: string } = {}
```
And ensure the select clause never includes `cost` for non-SUPERADMIN callers.

---

## Warnings

### WR-01: `localStorage` used for token storage instead of HttpOnly cookies — XSS risk

**File:** `app/admin/inventory/page.tsx:46`, `app/admin/products/page.tsx:62`, `app/admin/products/page.tsx:110`
**Issue:** Both admin pages read the access token via `localStorage.getItem('access_token')`. The CLAUDE.md security defaults explicitly require HttpOnly cookies for JWT storage ("Cookies for JWT storage (instead of HttpOnly) — Vulnerable to XSS"). Using `localStorage` exposes the token to any JavaScript running on the page, which is an XSS vector. Note: `app/cashier/pos/page.tsx` correctly uses `getAccessToken()` from `@/lib/auth/client` — the admin pages should use the same abstraction.
**Fix:** Replace `localStorage.getItem('access_token')` with the shared `getAccessToken()` from `@/lib/auth/client` in both admin pages:
```typescript
import { getAccessToken } from '@/lib/auth/client'
// ...
const token = getAccessToken()
```

### WR-02: POS page does not enforce stock limits server-side — oversell risk when APIs are created

**File:** `app/cashier/pos/page.tsx:347-350`
**Issue:** The `+` button for cart quantity is disabled when `item.quantity >= item.storeQty`, which is a good client-side guard. However, `storeQty` in the cart item is captured at the time the product is added to the cart (line 122: `storeQty: product.storeQty`). If another cashier sells the same item between the time the first cashier adds it to cart and submits checkout, the stock level shown is stale. The enforcement must happen at the sale submission API (`/api/cashier/sales`), which does not exist yet. When that route is implemented, it must validate stock availability inside a database transaction before decrementing.
**Fix:** When implementing `app/api/cashier/sales/route.ts`, use a Prisma transaction that locks the product row and checks `storeQty >= requestedQuantity` before creating the sale and decrementing stock:
```typescript
await prisma.$transaction(async (tx) => {
  for (const item of items) {
    const product = await tx.product.findUnique({ where: { id: item.productId } })
    if (!product || product.storeQty < item.quantity) {
      throw new Error(`Insufficient stock for ${item.productId}`)
    }
    await tx.product.update({
      where: { id: item.productId },
      data: { storeQty: { decrement: item.quantity } }
    })
  }
  // create Sale and SaleItems...
})
```

### WR-03: Schema has no `updatedAt` on `Product` — audit trail is incomplete

**File:** `prisma/schema.prisma:79-96`
**Issue:** The `Product` model has `updatedBy` (who last modified it) but no `updatedAt` timestamp. Inventory replenishment will update `storeQty` and `warehouseQty`, but there is no way to know when the last update occurred. For a financial/inventory system this is a meaningful audit gap — the `AuditLog` captures the event, but the product record itself has no modification timestamp.
**Fix:** Add `updatedAt` to the Product model:
```prisma
updatedAt    DateTime  @updatedAt @map("updated_at")
```

### WR-04: `AuditLog` model has no `entityType` index — slow queries on large audit tables

**File:** `prisma/schema.prisma:49-62`
**Issue:** The `AuditLog` table indexes `userId` and `createdAt` but not `entityType` or `action`. As the audit log grows (every sale, every inventory replenishment, every product create will produce entries), filtering by `entityType = 'PRODUCT'` or `action = 'SALE_CREATE'` — common admin report queries — will require full table scans.
**Fix:**
```prisma
@@index([entityType])
@@index([action])
```

### WR-05: `handleReplenish` in inventory page does not reset `submitting` state on early return

**File:** `app/admin/inventory/page.tsx:73-127`
**Issue:** When `qty < 1` (line 76-79) or `!replenishReason.trim()` (line 80-83) validation fails, the function returns early before calling `setSubmitting(true)`, so `submitting` remains `false` — this is actually fine. However, on lines 88-91, if `!token`, the function returns early *after* `setSubmitting(true)` (line 85) without ever calling `setSubmitting(false)`. This leaves the button permanently in the "Replenishing..." disabled state until the dialog is closed and reopened.
**Fix:**
```typescript
if (!token) {
  addToast('Not authenticated', 'error')
  setSubmitting(false)  // add this line
  return
}
```

---

## Info

### IN-01: `lib/audit/logger.ts` imports Prisma client dynamically on every call

**File:** `lib/audit/logger.ts:13`
**Issue:** `logAction` uses a dynamic `await import('@/lib/db')` on every invocation. Since `lib/db.ts` already implements the singleton pattern (global prisma client), a static import would be cleaner and avoids the dynamic import overhead on each audit log write.
**Fix:**
```typescript
import prisma from '@/lib/db'

export async function logAction(...) {
  return prisma.auditLog.create({ ... })
}
```

### IN-02: `app/api/products/route.ts` uses `where: any` type

**File:** `app/api/products/route.ts:108`
**Issue:** `const where: any = {}` disables type safety on the Prisma where clause. This is a code quality issue that could mask filter logic bugs.
**Fix:**
```typescript
const where: { category?: string; sku?: string } = {}
```

### IN-03: `components/AdminNav.tsx` has `console.error` for logout errors

**File:** `components/AdminNav.tsx:22`
**Issue:** `console.error('Logout error:', error)` should be removed or replaced with structured logging before production. It will leak error stack traces in browser devtools.
**Fix:** Remove the `console.error` call; the `addToast('Logout error', 'error')` on line 23 already communicates the failure to the user.

### IN-04: `SaleItem` schema stores `unitCost` but `Sale.total` does not store profit margin

**File:** `prisma/schema.prisma:117-131`
**Issue:** `SaleItem` correctly stores both `unitPrice` and `unitCost`, enabling per-item margin calculation. However `Sale` only stores `total` (revenue), not total cost or profit. Finance reports will need to JOIN and aggregate `SaleItem.unitCost * SaleItem.quantity` for every sale to compute profit, which becomes expensive at scale. Consider whether a denormalized `totalCost` on `Sale` is worthwhile for reporting performance.
**Fix (optional for Phase 2):** Add a `totalCost Decimal` field to the `Sale` model, populated at sale creation time, to enable O(1) profit margin lookups per sale without JOINs.

---

_Reviewed: 2026-04-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
