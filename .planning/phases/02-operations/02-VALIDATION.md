---
phase: 2
slug: operations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 |
| **Config file** | `vitest.config.ts` (exists, configured from Phase 1) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run test:coverage` |
| **Estimated runtime** | ~30–60 seconds (grows with Wave 0 stubs) |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm run test:coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-schema | 01 | 1 | INV-01–06, SALE-01–08 | — | N/A | unit | `npm test -- __tests__/unit/sales.test.ts` | ❌ W0 | ⬜ pending |
| 2-atomic-tx | 02 | 2 | INV-04, SALE-08 | Price manipulation, Race condition | Server reads price from locked DB row; SELECT FOR UPDATE prevents concurrent decrement | unit | `npm test -- __tests__/unit/sales.test.ts` | ❌ W0 | ⬜ pending |
| 2-concurrent | 02 | 2 | INV-04, SALE-08 | Inventory negative exploit | Only one of two concurrent cashiers succeeds when 1 unit remains | integration | `npm test -- __tests__/integration/concurrent-sale.test.ts` | ❌ W0 | ⬜ pending |
| 2-stock-check | 02 | 2 | INV-04, D-15 | Tampering | Reject sale if store_qty < requested quantity | unit | `npm test -- __tests__/unit/sales.test.ts` | ❌ W0 | ⬜ pending |
| 2-attribution | 02 | 2 | SALE-06, D-09/D-10 | Salesperson identity spoofing | Reject checkout if salespersonId missing or not CASHIER role | integration | `npm test -- __tests__/endpoints/sales.test.ts` | ❌ W0 | ⬜ pending |
| 2-price-snap | 02 | 2 | D-06 | Price manipulation | SaleItem unit_price/unit_cost from locked DB row, never request body | unit | `npm test -- __tests__/unit/sales.test.ts` | ❌ W0 | ⬜ pending |
| 2-replenish | 03 | 2 | INV-05, D-13 | Replenishment without warehouse stock | warehouse_qty >= quantity checked before update | unit | `npm test -- __tests__/unit/inventory.test.ts` | ❌ W0 | ⬜ pending |
| 2-audit-meta | 03 | 2 | AUDIT-02, D-17/D-19 | Audit trail poisoning | Before/after quantities in replenishment audit entry | unit | `npm test -- __tests__/unit/audit.test.ts` | ❌ W0 | ⬜ pending |
| 2-rbac-cashier | 02 | 2 | RBAC-03 | Elevation of Privilege | POST /api/cashier/sales rejects FINANCE role with 403 | integration | `npm test -- __tests__/endpoints/sales.test.ts` | ❌ W0 | ⬜ pending |
| 2-rbac-admin | 03 | 2 | RBAC-01 | Elevation of Privilege | POST /api/admin/inventory/replenish rejects CASHIER role with 403 | integration | `npm test -- __tests__/endpoints/inventory.test.ts` | ❌ W0 | ⬜ pending |
| 2-staff-picker | 02 | 2 | D-10 | — | GET /api/cashier/staff returns only CASHIER role users | integration | `npm test -- __tests__/endpoints/cashier-staff.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/unit/sales.test.ts` — atomic transaction logic, price snapshot, stock validation (INV-04, SALE-08, D-06, D-15)
- [ ] `__tests__/unit/inventory.test.ts` — replenishment logic, non-negative constraint (INV-05, SALE-08)
- [ ] `__tests__/unit/audit.test.ts` — extended logAction with metadata, new action types (AUDIT-02, D-17)
- [ ] `__tests__/endpoints/sales.test.ts` — POST /api/cashier/sales contract tests (RBAC, validation, response shape)
- [ ] `__tests__/endpoints/inventory.test.ts` — GET/POST inventory endpoints (RBAC, replenishment)
- [ ] `__tests__/endpoints/cashier-staff.test.ts` — GET /api/cashier/staff CASHIER-only filter (D-10)
- [ ] `__tests__/integration/concurrent-sale.test.ts` — Two simultaneous sales of last unit (critical race condition test, requires real DB via `DATABASE_URL`)

**Note on concurrent sale test:** Requires real PostgreSQL (cannot mock SELECT FOR UPDATE). Add a separate `test:integration` script in `package.json` requiring `DATABASE_URL` to be set.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| POS two-panel layout renders correctly | D-01 | Visual/interaction — cannot automate | Open `/cashier/pos`, verify search left + cart right layout |
| Checkout confirmation screen appears and dismisses | D-03 | Visual flow | Complete a sale; verify confirmation modal shows; dismiss and verify new cart state |
| Cash payment shows correct change due | D-08 | UI calculation display | Enter amount received > total; verify change due displayed |
| On-screen receipt shows salesperson name | SALE-07 | Visual content | Complete sale with attribution; verify confirmation shows salesperson name |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
