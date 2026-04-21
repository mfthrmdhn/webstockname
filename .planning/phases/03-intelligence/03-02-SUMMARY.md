---
phase: 03-intelligence
plan: "02"
subsystem: api-routes
tags: [reports, incentives, rbac, audit, tdd]
dependency_graph:
  requires:
    - "03-01"  # Prisma schema with Sale, SaleItem, Incentive models
  provides:
    - "GET /api/reports/sales"
    - "GET /api/reports/staff"
    - "GET /api/reports/reconciliation"
    - "GET /api/incentives"
    - "POST /api/incentives"
    - "GET /api/incentives/cashiers"
  affects:
    - "03-03"  # Finance UI depends on these data routes
tech_stack:
  added: []
  patterns:
    - "Two-query groupBy pattern (Prisma constraint: no include inside groupBy)"
    - "Decimal→Number conversion for all money fields before JSON response"
    - "date field filter (not createdAt) for incentive period queries"
    - "TDD: RED commit then GREEN commit per task"
key_files:
  created:
    - app/api/reports/sales/route.ts
    - app/api/reports/staff/route.ts
    - app/api/reports/reconciliation/route.ts
    - app/api/incentives/route.ts
    - app/api/incentives/cashiers/route.ts
    - __tests__/api/reports/routes.test.ts
    - __tests__/api/incentives/route.test.ts
  modified:
    - lib/audit/logger.ts
decisions:
  - "Incentives filter by `date` field (business period), not `createdAt` (entry timestamp) — prevents wrong period reporting"
  - "No PUT/DELETE on /api/incentives — append-only by construction (D-11 immutability)"
  - "POST /api/incentives restricted to SUPERADMIN; FINANCE gets 403 (T-03-02-01 mitigated)"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-21"
  tasks_completed: 2
  files_created: 7
  files_modified: 1
---

# Phase 3 Plan 02: Report and Incentive API Routes Summary

**One-liner:** Four RBAC-enforced API routes providing paginated sales reports with server-side margin, staff aggregations via two-query groupBy, payment reconciliation totals, and SUPERADMIN-only incentive creation with INCENTIVE_CREATE audit log emission.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement GET /api/reports/sales, /staff, /reconciliation | 272dfdd | 3 route files created |
| 2 | Implement GET+POST /api/incentives + extend audit logger | e4f2276 | 2 route files + logger updated |

---

## What Was Built

### GET /api/reports/sales
- Paginated list (limit=50) with server-side margin% calculation
- Margin formula: `(revenue - cost) / revenue * 100`, toFixed(1), null when revenue=0
- All Decimal fields converted via `Number()` before JSON response
- Date range filtering via `start`/`end` query params on `createdAt`
- FINANCE + SUPERADMIN allowed; CASHIER gets 403

### GET /api/reports/staff
- Aggregates sales by salesperson: salesCount, totalRevenue, itemsSold
- Uses Prisma `groupBy` + separate `user.findMany` (Prisma cannot `include` inside `groupBy`)
- FINANCE + SUPERADMIN allowed

### GET /api/reports/reconciliation
- Groups sales by paymentMethod; returns `{ cash, card, transfer, grandTotal }`
- FINANCE + SUPERADMIN allowed

### GET /api/incentives
- Paginated list (limit=25) with salesperson and enteredBy usernames
- Date filter uses `date` field (incentive period), NOT `createdAt` (entry timestamp)
- FINANCE + SUPERADMIN allowed

### POST /api/incentives
- SUPERADMIN-only (FINANCE → 403)
- Zod validation: cuid salespersonId, positive amount, YYYY-MM-DD date, non-empty note
- Emits `logAction(userId, 'INCENTIVE_CREATE', 'INCENTIVE', incentive.id, metadata)`
- Returns 201 `{ id, amount }`

### GET /api/incentives/cashiers
- SUPERADMIN-only; returns active CASHIER role users for salesperson picker in Add Incentive modal (D-12)

### lib/audit/logger.ts
- Added `INCENTIVE_CREATE` to registered action types documentation comment (Phase 3 addition)

---

## TDD Gate Compliance

**Task 1:**
- RED commit: `8ad3773` — failing tests for report routes (modules not found)
- GREEN commit: `272dfdd` — routes implemented, all 7 tests pass

**Task 2:**
- RED commit: `b9dfc66` — failing tests for incentives routes (modules not found)
- GREEN commit: `e4f2276` — routes implemented, all 7 tests pass

All TDD gates satisfied.

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None — all routes connect to real Prisma queries. No hardcoded or placeholder data.

---

## Threat Flags

No new security surface beyond what the plan's threat model already covers. All T-03-02-xx mitigations applied as specified.

---

## Self-Check: PASSED

All created files confirmed on disk:
- app/api/reports/sales/route.ts: FOUND
- app/api/reports/staff/route.ts: FOUND
- app/api/reports/reconciliation/route.ts: FOUND
- app/api/incentives/route.ts: FOUND
- app/api/incentives/cashiers/route.ts: FOUND

All task commits confirmed in git log:
- 8ad3773 (test RED - reports): FOUND
- 272dfdd (feat GREEN - reports): FOUND
- b9dfc66 (test RED - incentives): FOUND
- e4f2276 (feat GREEN - incentives): FOUND

Test suite: 568 passed, 0 failed.
