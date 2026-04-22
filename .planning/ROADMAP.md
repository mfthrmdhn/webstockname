# WebStockName Roadmap

**Created:** 2026-04-14  
**Granularity:** Coarse (3 phases)  
**Coverage:** 45/45 v1 requirements mapped

---

## Phases

- [x] **Phase 1: Foundation** - Secure authentication, role-based access, audit infrastructure ✓ 2026-04-14
- [x] **Phase 2: Operations** - Inventory management, sales processing, atomic transactions ✓ 2026-04-21
- [x] **Phase 3: Intelligence** - Financial reporting, incentive tracking, reconciliation ✓ 2026-04-21

---

## Phase Details

### Phase 1: Foundation
**Goal:** Users can securely access the system with role-based permissions and all operations are immutably logged.

**Depends on:** Nothing (foundational)

**Requirements:** AUTH-01, AUTH-02, AUTH-03, RBAC-01, RBAC-02, RBAC-03, RBAC-04, USER-01, USER-02, USER-03, USER-04, USER-05, PROD-01, AUDIT-01, AUDIT-03, AUDIT-06

**Success Criteria** (what must be TRUE):
1. Staff member can log in with unique username/password and stay logged in across page refreshes
2. Each user role (Superadmin, Finance, Cashier) can only access permitted endpoints (e.g., Cashier cannot view reports)
3. Superadmin can create/edit/deactivate user accounts and assign roles
4. Every state-changing operation (login, logout, user create, etc.) is recorded in append-only audit log that cannot be deleted or edited
5. All endpoints enforce role-based access at API level before any business logic executes

**Plans:** TBD

**UI hint**: yes

---

### Phase 2: Operations
**Goal:** Cashiers can process sales with real-time inventory visibility, and inventory decreases atomically with sale completion without data loss or race conditions.

**Depends on:** Phase 1 (users/auth required)

**Requirements:** INV-01, INV-02, INV-03, INV-04, INV-05, INV-06, SALE-01, SALE-02, SALE-03, SALE-04, SALE-05, SALE-06, SALE-07, SALE-08, PROD-02, PROD-03, PROD-04, AUDIT-02

**Success Criteria** (what must be TRUE):
1. Cashier can search products by name or scan barcode and see real-time stock levels (store + warehouse separately)
2. Cashier can add/remove items and process payment (cash or card), generating itemized receipt
3. Sale transaction and inventory decrement happen atomically (both succeed or both rollback; no partial updates)
4. Inventory never goes negative; if stock unavailable, sale is rejected before payment is taken
5. Superadmin can manually replenish inventory from warehouse to store; replenishment is logged with timestamp and user
6. Every inventory change (sale, replenishment) is recorded in audit trail with before/after quantities and who made the change

**Plans:** 8 plans (5 initial + 3 gap closure)

Plans:
- [x] 02-01-PLAN.md — Schema migration (Sale/SaleItem/pricing fields) + logAction extension + test scaffolds
- [x] 02-02-PLAN.md — Cashier API routes: product search, staff picker, atomic checkout
- [x] 02-03-PLAN.md — Admin inventory API routes + middleware /cashier/* protection
- [x] 02-04-PLAN.md — POS UI: two-panel layout, cart, checkout, confirmation screen
- [x] 02-05-PLAN.md — Admin inventory UI + AdminNav link + product form pricing fields
- [x] 02-06-PLAN.md — Admin inventory page loading fix + CashierNav with logout
- [x] 02-07-PLAN.md — Login system investigation and fix (gap closure)
- [x] 02-08-PLAN.md — Product form: add store_qty and warehouse_qty fields (gap closure)
- [ ] 02-09-PLAN.md — Move audit log inside transaction for atomic SALE_CREATE (gap closure: CR-01)
- [ ] 02-10-PLAN.md — Remove cost field from cashier products API (gap closure: CR-02)
- [ ] 02-11-PLAN.md — Fail closed on missing JWT_SECRET (gap closure: CR-03)

**UI hint**: yes

---

### Phase 3: Intelligence
**Goal:** Finance team can view daily sales and incentive reports, and superadmin can manage incentives with full audit accountability.

**Depends on:** Phase 2 (sales and inventory data required)

**Requirements:** REPORT-01, REPORT-02, REPORT-03, REPORT-04, REPORT-05, REPORT-06, INCENT-01, INCENT-02, INCENT-03, INCENT-04, AUDIT-04, AUDIT-05

**Success Criteria** (what must be TRUE):
1. Finance can view daily sales report showing transaction list, total revenue, item count, and breakdown by staff member
2. Finance can see product cost and margin (revenue - cost / revenue) for each sale
3. Finance can view end-of-day reconciliation comparing system-recorded sales to physical cash/inventory count
4. Superadmin can manually enter incentive amounts for salespeople with audit trail (who entered it, when, what amount)
5. Finance can view all incentives owed to each staff member by date range
6. Superadmin can view comprehensive audit trail filtered by date, user, or operation type; audit records are immutable

**Plans:** 4 plans

Plans:
- [ ] 03-01-PLAN.md — Incentive schema migration + test stubs
- [ ] 03-02-PLAN.md — Report & incentive API routes
- [ ] 03-03-PLAN.md — Finance layout, nav, reports page, login redirect
- [ ] 03-04-PLAN.md — Audit page extension (Details column + new action types)

**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 9/9 | COMPLETE | 01-01 through 01-09 |
| 2. Operations | 8/11 | In progress | 02-01 through 02-08, gap closure pending (02-09, 02-10, 02-11) |
| 3. Intelligence | 0/4 | Not started | - |

---

## Notes

### Architectural Decisions

**Phase 1 — Immutable Audit Logging (Non-Negotiable)**
- Audit trail implemented as append-only database table (no UPDATE/DELETE allowed)
- Every state change logged: who, what, when, before/after values
- Superadmin cannot modify/delete audit logs
- Retention: minimum 3 years (regulatory requirement)
- Rationale: Compliance, accountability, and fraud detection depend on immutable history; cannot be retrofitted later

**Phase 2 — Atomic Inventory Transactions (Non-Negotiable)**
- Sales completion and inventory decrement occur in single database transaction
- Row-level locking (SELECT FOR UPDATE) prevents race conditions when multiple cashiers sell same item
- Inventory never decrements without sale record, and sale never completes without inventory decrement
- Warehouse and store inventory tracked separately; cashiers can check both but only sell from store stock
- Rationale: Data integrity and financial accuracy depend on atomicity; prevents double-sells, inventory desync, and financial reporting errors

**Phase 2 — Sales Attribution Immutability**
- Attribution recorded at moment of sale and cannot be changed retroactively
- Only the cashier at the terminal can attribute a sale (no reassignment)
- Audit log tracks any rare attribution changes with approval and reason
- Rationale: Prevents fraud and incentive disputes; ensures financial data integrity

**Phase 3 — Manual Incentive Validation**
- Incentive entry requires superadmin proposal → Finance verification → Superadmin approval
- Finance must verify incentive matches attributed sales within acceptable margin
- Supporting evidence (sales reports) attached to each incentive entry
- Rationale: Prevents overpayment and ensures accountability in payroll

### Pitfall Prevention

This roadmap directly addresses critical pitfalls identified in research:

- **Pitfall 1 (Inventory Desync)**: Phase 2 implements atomic transactions, audit trails, and location-based tracking
- **Pitfall 2 (Sales Attribution Falsification)**: Phase 2 enforces immutable attribution at transaction time with audit
- **Pitfall 3 (Race Conditions)**: Phase 2 uses database-level row locks and transaction isolation
- **Pitfall 4 (RBAC Misconfiguration)**: Phase 1 establishes documented three-role system with endpoint enforcement
- **Pitfall 5 (Reconciliation Gaps)**: Phase 3 implements end-of-day reconciliation with variance detection
- **Pitfall 6 (Audit Trail Gaps)**: Phase 1 establishes immutable logging; Phase 2 logs all state changes
- **Pitfall 7 (Incentive Decoupling)**: Phase 3 requires verification against actual sales data
- **Pitfall 8 (Shortage Detection Delay)**: Phase 3 includes daily reconciliation and variance alerts
- **Pitfall 9 (Warehouse/Store Split)**: Phase 2 separates inventory by location with transfer workflow

### Research Alignment

**Architecture:** Monolith with layered structure (API → Domain → Infrastructure) per ARCHITECTURE.md  
**Stack:** PostgreSQL for transactional data + audit logs, REST API, role-based middleware  
**Scaling:** Designed for 0-100 daily transactions (single store); indices and caching added in Phase 3+ if needed

---

*Roadmap created: 2026-04-14*
*Gap closure plans added: 2026-04-22*
