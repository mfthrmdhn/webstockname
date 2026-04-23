---
phase: 04-product-management-crud-operations
plan: "01"
subsystem: backend-api
tags: [product-management, audit-logging, rbac, prisma, migration]
dependency_graph:
  requires: []
  provides: [PATCH /api/products/[id], DELETE /api/products/[id], is_active migration]
  affects: [app/api/products/[id]/route.ts, prisma/schema.prisma, lib/audit/logger.ts]
tech_stack:
  added: []
  patterns: [delta-audit-logging, sales-history-guard, soft-delete-field]
key_files:
  created:
    - app/api/products/[id]/route.ts
    - prisma/migrations/20260423154624_add_product_is_active/migration.sql
  modified:
    - lib/audit/logger.ts
decisions:
  - "Extract product ID from request.nextUrl.pathname (not route params) for Next.js App Router compatibility"
  - "Remap is_active to isActive in Prisma data to match camelCase field name in schema"
  - "Use String() comparison for Decimal fields to detect changes accurately"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-23"
  tasks_completed: 4
  files_modified: 3
---

# Phase 04 Plan 01: Backend API Routes & Schema for Product Edit/Delete Summary

**One-liner:** PATCH and DELETE endpoints for products with delta audit logging, sales-history guard, and is_active migration.

## What Was Built

- **PATCH /api/products/[id]:** Updates any subset of product fields (name, sku, sellingPrice, cost, storeQty, warehouseQty, category, is_active). Enforces SUPERADMIN RBAC. Validates SKU uniqueness if changing SKU. Logs only changed fields (before/after delta) to audit_log with action PRODUCT_UPDATE.
- **DELETE /api/products/[id]:** Blocks hard-delete if product has any SaleItem records, returning 400 with salesCount. If no sales exist, deletes product in a transaction and logs full snapshot (before/after: null) with action PRODUCT_DELETE. Enforces SUPERADMIN RBAC.
- **is_active migration:** Created migration `20260423154624_add_product_is_active` to add the is_active column to the products table. The field existed in schema.prisma but had no corresponding migration — the database reset surfaced this gap.
- **logAction extended:** Added PRODUCT_CREATE, PRODUCT_UPDATE, PRODUCT_DELETE to the JSDoc action type registry in lib/audit/logger.ts.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add is_active migration (field was already in schema) | 534b777 |
| 2 | Extend logAction with PRODUCT_UPDATE/PRODUCT_DELETE action types | 6b093cb |
| 3 | Create PATCH /api/products/[id] with delta audit logging | 47de8d1 |
| 4 | Create DELETE /api/products/[id] with sales history guard | 47de8d1 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing migration for is_active field**
- **Found during:** Task 1 (database reset revealed seed failure: column `is_active` does not exist)
- **Issue:** schema.prisma had `isActive Boolean @default(true) @map("is_active")` but no migration had been created for it; previous work added the field to schema without running `migrate dev`
- **Fix:** Ran `npx prisma migrate dev --name add_product_is_active` to generate and apply the migration
- **Files modified:** prisma/migrations/20260423154624_add_product_is_active/migration.sql, prisma/schema.prisma
- **Commit:** 534b777

**2. [Rule 1 - Bug] ZodError.errors property does not exist (use .issues)**
- **Found during:** Task 3 TypeScript check
- **Issue:** `validation.error.errors` caused TS2339; Zod 3.x exposes `.issues` not `.errors` on the error object
- **Fix:** Changed to `validation.error.issues`
- **Commit:** 47de8d1

## Known Stubs

None — all endpoints are fully wired to database.

## Threat Flags

None — PATCH and DELETE both enforce SUPERADMIN RBAC before any logic; no new trust boundary surfaces introduced.

## Self-Check: PASSED

- app/api/products/[id]/route.ts: EXISTS
- prisma/migrations/20260423154624_add_product_is_active/migration.sql: EXISTS
- lib/audit/logger.ts: MODIFIED with PRODUCT_UPDATE and PRODUCT_DELETE
- Commits 534b777, 6b093cb, 47de8d1: verified in git log
