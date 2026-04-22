---
phase: 02-operations
plan: 02
subsystem: cashier-api
tags: [api-routes, rbac, prisma-transaction, for-update, price-snapshot, audit]
dependency_graph:
  requires: [02-01]
  provides: [cashier-products-endpoint, cashier-staff-endpoint, cashier-sales-endpoint]
  affects: [02-04]
tech_stack:
  added: []
  patterns: [prisma-transaction-for-update, price-snapshot-from-db, atomic-inventory-decrement, zod-refine-cross-field]
key_files:
  created:
    - app/api/cashier/products/route.ts
    - app/api/cashier/staff/route.ts
    - app/api/cashier/sales/route.ts
  modified: []
decisions:
  - "SELECT FOR UPDATE inside $transaction prevents concurrent overselling (T-02-05)"
  - "unitPrice/unitCost on SaleItem come from locked DB row exclusively — client payload carries productId+quantity only (T-02-04)"
  - "Zod .refine() enforces cross-field constraint: CASH payment requires amountReceived"
  - "Stock error messages use exact format 'Only X in stock for Y' for consistent client-side parsing"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-20"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 02 Plan 02: Cashier API Routes Summary

**One-liner:** Three RBAC-gated cashier API routes — product search, active-CASHIER staff list, and atomic POS checkout with FOR UPDATE row lock and price snapshot.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create GET /api/cashier/products and GET /api/cashier/staff | 4301081 | app/api/cashier/products/route.ts, app/api/cashier/staff/route.ts |
| 2 | Create POST /api/cashier/sales (atomic checkout) | e821ad4 | app/api/cashier/sales/route.ts |

## What Was Built

### GET /api/cashier/products
- Accepts optional `?search=` query param; matches product `name` (ILIKE) or exact `sku`
- Returns up to 20 products ordered by name: `id, name, sku, sellingPrice, cost, storeQty, warehouseQty`
- RBAC: CASHIER and SUPERADMIN allowed; FINANCE returns 403

### GET /api/cashier/staff
- Returns only `{ id, username }` for users where `isActive === true` and `role.name === 'CASHIER'`
- FINANCE and SUPERADMIN users are excluded at query level
- RBAC: CASHIER and SUPERADMIN allowed; FINANCE returns 403

### POST /api/cashier/sales
- Validates payload with Zod: `items[]`, `salespersonId` (cuid), `paymentMethod` (CASH|CARD|TRANSFER), optional `amountReceived`
- Cross-field validation: CASH payment requires `amountReceived`
- Entire checkout runs in `prisma.$transaction`:
  1. `SELECT FOR UPDATE` locks all product rows (prevents concurrent overselling)
  2. Stock check: throws `Only X in stock for "Name"` on any insufficient item
  3. Calculates total from locked `selling_price` (never from request body)
  4. Creates `Sale` record
  5. Creates `SaleItem` records with `unitPrice` and `unitCost` from locked row
  6. Decrements `store_qty` atomically via raw `UPDATE`
- Returns 201: `{ saleId, total, itemCount, paymentMethod, changeDue? }`
- `changeDue` included only for CASH payments
- Calls `logAction('SALE_CREATE', 'SALE', sale.id, { cashierId, salespersonId, total, paymentMethod, itemCount })` after commit
- RBAC: CASHIER and SUPERADMIN allowed; FINANCE returns 403

## Test Results

All 183 tests pass (13 test files) — no regressions from previous wave.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all three routes are fully wired to Prisma. No placeholder data.

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: POST-endpoint | app/api/cashier/sales/route.ts | New checkout endpoint at trust boundary browser → DB; mitigated per T-02-04 (FOR UPDATE price lock), T-02-05 (atomic decrement), T-02-07 (RBAC), T-02-08 (audit log) as specified in plan threat model |

## Self-Check: PASSED

- [x] app/api/cashier/products/route.ts exists with `take: 20` and `CASHIER.*SUPERADMIN` RBAC
- [x] app/api/cashier/staff/route.ts exists with `role: { name: 'CASHIER' }` and `isActive: true` filter
- [x] app/api/cashier/sales/route.ts exists with `FOR UPDATE`, `prisma.$transaction`, `SALE_CREATE`
- [x] Commits 4301081, e821ad4 exist in git log
- [x] 183 tests passing, 0 failures
