---
phase: 02-operations
plan: "03"
subsystem: inventory-api
tags: [inventory, replenishment, middleware, rbac, audit]
dependency_graph:
  requires: [02-01]
  provides: [inventory-list-api, replenish-api, cashier-route-protection]
  affects: [middleware.ts, app/api/admin/inventory]
tech_stack:
  added: []
  patterns: [prisma-transaction, logAction-audit, zod-validation, rbacMiddleware]
key_files:
  created:
    - app/api/admin/inventory/route.ts
    - app/api/admin/inventory/replenish/route.ts
  modified:
    - middleware.ts
decisions:
  - "Warehouse stock check inside prisma.$transaction to prevent TOCTOU race condition"
  - "FINANCE role blocked from /cashier/* at middleware level (redirects to /login)"
  - "Audit log placed after successful transaction to avoid logging failed operations"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-21"
  tasks: 2
  files_changed: 3
---

# Phase 02 Plan 03: Inventory API Routes and Cashier Middleware Summary

**One-liner:** SUPERADMIN inventory GET/POST API with atomic warehouse-to-store stock movement, before/after audit trail, and /cashier/* middleware protection for CASHIER and SUPERADMIN roles.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create inventory API routes | 640a664 | app/api/admin/inventory/route.ts, app/api/admin/inventory/replenish/route.ts |
| 2 | Extend middleware.ts for /cashier/* | 5cbc371 | middleware.ts |

## What Was Built

### GET /api/admin/inventory

- SUPERADMIN-only endpoint returning all products with `id`, `name`, `sku`, `sellingPrice`, `cost`, `storeQty`, `warehouseQty` ordered by name
- RBAC enforced via `rbacMiddleware(['SUPERADMIN'])` — CASHIER/FINANCE roles receive 403

### POST /api/admin/inventory/replenish

- Accepts `{ productId, quantity, reason }` — Zod validates: productId as CUID, quantity int min(1), reason string 1-500 chars
- Warehouse stock check (`product.warehouseQty < quantity`) inside `prisma.$transaction` — returns 400 with exact available quantity if insufficient
- Atomic update: `storeQty += quantity`, `warehouseQty -= quantity` in single transaction
- `logAction` called with `INVENTORY_REPLENISH`, entity `PRODUCT`, metadata includes `qty_moved`, `reason`, `before.storeQty`, `before.warehouseQty`, `after.storeQty`, `after.warehouseQty`
- Returns `{ productId, newStoreQty, newWarehouseQty }` on success

### middleware.ts — /cashier/* protection

- Added `/cashier/:path*` to `config.matcher`
- New branch checks JWT cookie; validates role in `['CASHIER', 'SUPERADMIN']`; redirects FINANCE and unauthenticated users to `/login`
- Existing `/admin` protection unchanged

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-02-09 | FINANCE role redirected from /cashier/* at middleware level |
| T-02-10 | warehouse_qty >= quantity validated inside $transaction before update |
| T-02-11 | Zod validates quantity is int min(1) — rejects 0 and negative values |
| T-02-12 | logAction records before/after quantities, reason, and superadminId |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows are wired to the database.

## Threat Flags

None — no new security surface introduced beyond what is in the plan's threat model.

## Self-Check: PASSED

- app/api/admin/inventory/route.ts: FOUND
- app/api/admin/inventory/replenish/route.ts: FOUND
- middleware.ts /cashier branch: FOUND
- Commit 640a664: FOUND
- Commit 5cbc371: FOUND
