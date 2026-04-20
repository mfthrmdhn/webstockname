---
phase: 02-operations
plan: 01
subsystem: database-schema
tags: [prisma, schema, migrations, test-scaffolds, audit]
dependency_graph:
  requires: []
  provides: [sale-model, sale-item-model, product-pricing-fields, audit-metadata, test-scaffolds]
  affects: [02-02, 02-03, 02-04, 02-05]
tech_stack:
  added: []
  patterns: [prisma-decimal-for-currency, check-constraints-for-non-negative-qty, contract-test-stubs]
key_files:
  created:
    - prisma/migrations/20260420134342_phase2_operations_schema/migration.sql
    - prisma/migrations/20260420134347_phase2_check_constraints/migration.sql
    - prisma/migrations/migration_lock.toml
    - __tests__/unit/sales.test.ts
    - __tests__/unit/inventory.test.ts
    - __tests__/unit/audit.test.ts
    - __tests__/endpoints/sales.test.ts
    - __tests__/endpoints/inventory.test.ts
    - __tests__/endpoints/cashier-staff.test.ts
    - __tests__/integration/concurrent-sale.test.ts
  modified:
    - prisma/schema.prisma
    - lib/audit/logger.ts
    - package.json
decisions:
  - "Decimal(10,2) for sellingPrice and cost — prevents float precision loss in financial calculations (T-02-01)"
  - "metadata Json? on AuditLog — nullable to keep backward compatibility with existing 4-arg callers"
  - "CHECK constraints added as separate migration (phase2-check-constraints) for clarity"
  - "Integration test todos deferred — require live DB; contract test included as runnable scaffold"
metrics:
  duration: "~4 minutes"
  completed: "2026-04-20"
  tasks_completed: 3
  files_created: 10
  files_modified: 3
---

# Phase 02 Plan 01: Database Schema Foundation and Test Scaffolds Summary

**One-liner:** Extended Prisma schema with Sale/SaleItem/Product pricing models, AuditLog metadata column, CHECK constraints, and 7 contract test scaffold files.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend Prisma schema and run migration | 0086f32 | prisma/schema.prisma, 2 migration files |
| 2 | Extend logAction with metadata parameter | 58bcc78 | lib/audit/logger.ts |
| 3 | Create test scaffolds for Wave 0 | 05d4fba | 7 test files, package.json |

## What Was Built

### Schema Changes (prisma/schema.prisma)
- **Product model extended**: Added `sellingPrice` (Decimal 10,2), `cost` (Decimal 10,2), `storeQty` (Int), `warehouseQty` (Int), `saleItems` relation, `name` index
- **AuditLog model extended**: Added `metadata Json?` field for structured audit data
- **User model extended**: Added `cashierSales` and `salespersonSales` relations
- **Sale model added**: Links cashier + salesperson (both User), paymentMethod, total (Decimal), itemCount, items relation
- **SaleItem model added**: Links sale + product, captures quantity, unitPrice, unitCost (price snapshot at sale time)

### Database Migrations Applied
- `20260420134342_phase2_operations_schema`: Main schema migration (Sale, SaleItem, Product extensions)
- `20260420134347_phase2_check_constraints`: CHECK constraints enforcing `store_qty >= 0` and `warehouse_qty >= 0`

### Audit Logger (lib/audit/logger.ts)
- Added optional 5th parameter `metadata?: Record<string, unknown>`
- Persists metadata to `AuditLog.metadata` Json? column
- Fully backward compatible — all existing 4-arg callers unchanged

### Test Scaffolds (7 files)
- `__tests__/unit/sales.test.ts` — Contract tests for stock validation, price snapshot, total calculation, change due, attribution
- `__tests__/unit/inventory.test.ts` — Contract tests for replenishment logic and non-negative constraints
- `__tests__/unit/audit.test.ts` — Contract tests for extended logAction signature and audit entry structure
- `__tests__/endpoints/sales.test.ts` — Endpoint contract stubs for POST /api/cashier/sales
- `__tests__/endpoints/inventory.test.ts` — Endpoint contract stubs for GET/POST /api/admin/inventory
- `__tests__/endpoints/cashier-staff.test.ts` — Endpoint contract stubs for GET /api/cashier/staff
- `__tests__/integration/concurrent-sale.test.ts` — Race condition test scaffold (2 todos + 1 passing contract)

### package.json
- Added `test:integration` script: `DATABASE_URL=$DATABASE_URL vitest run __tests__/integration`

## Test Results

- **Before:** 146 tests passing (6 test files)
- **After:** 183 tests passing + 2 todo stubs (13 test files)
- All new unit and endpoint tests pass (inline mock data, no DB required)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all test files use inline mock data. No production code stubs exist.

## Threat Surface Scan

No new network endpoints or auth paths introduced. Schema changes are internal database structure only.

## Self-Check: PASSED

- [x] prisma/schema.prisma exists and contains `model Sale`
- [x] lib/audit/logger.ts exists with `metadata?: Record<string, unknown>`
- [x] All 7 test files exist
- [x] package.json has `test:integration` script
- [x] Commits 0086f32, 58bcc78, 05d4fba exist in git log
- [x] `npx prisma validate` exits 0 (verified during execution)
- [x] 183 tests passing
