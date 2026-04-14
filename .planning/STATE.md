---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: Phase 1 Foundation (in progress, 4 of 9 plans complete)
status: unknown
last_updated: "2026-04-14T11:58:15Z"
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 9
  completed_plans: 4
  percent: 44
---

# PROJECT STATE: WebStockName

**Last Updated:** 2026-04-14 (Plan 01-04 Complete)  
**Current Milestone:** WebStockName v1  
**Current Phase:** Phase 1 Foundation (in progress, 4 of 9 plans complete)

---

## Project Reference

**Core Value:** Complete visibility across sales, inventory, and incentives — from customer purchase to payroll settlement.

**Current Focus:** Establish roadmap and begin Phase 1 planning (authentication, RBAC, audit infrastructure).

**Key Stakeholders:** Single store operations (cashiers, finance team, superadmin).

---

## Current Position

**Milestone:** WebStockName v1  
**Roadmap Status:** Complete (3 phases defined, 45/45 requirements mapped)  
**Planning Status:** Ready for Phase 1 planning

### Phase Progress

```
Phase 1: Foundation       [============            ] 44% - In progress (4/9 plans complete)
Phase 2: Operations      [                        ] 0% - Not started
Phase 3: Intelligence    [                        ] 0% - Not started
```

**Latest completion:** Plan 01-04 (User Management CRUD) - Complete user lifecycle management API for superadmin staff with RBAC enforcement and audit logging

### Critical Path

1. **Phase 1 (Foundation)**: Auth, RBAC, Audit infrastructure — blocks Phase 2
2. **Phase 2 (Operations)**: Inventory + Sales with atomic transactions — blocks Phase 3
3. **Phase 3 (Intelligence)**: Reporting, reconciliation, incentives — final delivery

---

## Performance Metrics

**Roadmap Quality:**

- Requirement coverage: 45/45 (100%)
- Phases identified: 3 (coarse granularity)
- Average requirements per phase: 15
- Dependencies: Linear (Phase 1 → Phase 2 → Phase 3)

**Estimated Effort (rough):**

- Phase 1: Database + auth + RBAC middleware = ~2-3 sprints
- Phase 2: POS UI + inventory service + atomic transactions = ~3-4 sprints
- Phase 3: Reporting dashboard + reconciliation + incentive workflows = ~2-3 sprints
- **Total v1 estimate:** ~8-10 weeks (single developer + Claude)

---

## Architectural Decisions

**Foundation (Phase 1 — Immutable Audit Logging)**

- Audit trail: append-only database table, no UPDATE/DELETE
- Every state change logged: who, what, when, before/after values
- Superadmin cannot modify/delete logs (enforced at database level)
- Retention: 3+ years
- **Why this first:** Compliance and fraud detection depend on immutable history; cannot retrofit later

**Operations (Phase 2 — Atomic Inventory Transactions)**

- Sales completion + inventory decrement: single database transaction
- Row-level locking (SELECT FOR UPDATE) prevents race conditions
- Inventory never goes negative; cashiers can't sell beyond stock
- Warehouse and store tracked separately
- **Why this second:** Data integrity depends on atomicity; unblocks Phase 3 reporting accuracy

**Operations (Phase 2 — Sales Attribution Immutability)**

- Attribution recorded at sale time, cannot change retroactively
- Only cashier at terminal can attribute (no reassignment)
- Rare changes logged with audit trail
- **Why:** Prevents fraud and incentive disputes

**Intelligence (Phase 3 — Manual Incentive Validation)**

- Superadmin proposes → Finance verifies → Superadmin approves
- Finance checks incentive against attributed sales data
- Supporting evidence attached to each entry
- **Why:** Prevents overpayment and ensures payroll accountability

---

## Accumulated Context

### Key Assumptions

1. **Single store only** — No multi-location complexity in v1
2. **Manual incentive entry** — No automated commission calculation (business rules not defined)
3. **Three roles** — Superadmin (all), Finance (read-only reports), Cashier (stock check + sales only)
4. **Daily operations cadence** — Close-out reconciliation happens once per day
5. **PostgreSQL** — Relational database for transactional data and audit logs

### Design Principles

- **Atomicity over convenience** — Sales and inventory updates are single transaction; no split operations
- **Audit first** — Every state change logged immediately; audit trail is system of record
- **Role-based at API layer** — Access control enforced before business logic, not after
- **Immutability where it matters** — Audit logs, sales attribution, incentive records cannot be edited retroactively
- **Location-aware inventory** — Store and warehouse tracked separately; transfers are explicit operations

### Open Questions / To-Decide

- Payment processing (Phase 2): Cash only, or card integration via Stripe/Square?
  - **Decision needed:** How are card payments processed? Synchronously or async with webhook?
  - **Impact:** Phase 2 scope and complexity
- Warehouse vs. store in MVP (Phase 2): Simple two-location split, or more complex?
  - **Decision:** Keep it simple — warehouse as "reserved" until moved to store floor
  - **Impact:** Simpler inventory logic, addresses Pitfall 9 (warehouse split)
- Email/SMS notifications (Phase 3): Out of scope for v1, or include for low-stock alerts?
  - **Decision:** Out of scope; manual dashboard checks sufficient for MVP
- Reporting caching (Phase 3): Real-time or snapshot-based reports?
  - **Decision:** Snapshot-based (daily) for single-store volume; no caching needed initially

### Pitfalls Being Actively Mitigated

1. **Inventory Desync** — Phase 2 atomic transactions + audit trails prevent this
2. **Sales Attribution Fraud** — Phase 2 immutable attribution at transaction time
3. **Race Conditions** — Phase 2 row-level locking (SELECT FOR UPDATE)
4. **RBAC Drift** — Phase 1 documented three-role system with endpoint enforcement
5. **Reconciliation Gaps** — Phase 3 daily end-of-day reconciliation
6. **Audit Trail Gaps** — Phase 1 immutable logging from day 1
7. **Incentive Decoupling** — Phase 3 manual verification against sales data
8. **Shortage Detection Delay** — Phase 3 daily variance detection and alerting
9. **Warehouse/Store Split** — Phase 2 location-based inventory tracking

---

## Accumulated Decisions

(To be updated as phases are planned and implemented)

| Decision | Rationale | Status | Phase |
|----------|-----------|--------|-------|
| Immutable audit logging from Phase 1 | Cannot retrofit without data loss; compliance requirement | Approved | 1 |
| Atomic sales + inventory transactions | Prevents double-sells and inventory desync | Approved | 2 |
| Three-role RBAC (Superadmin/Finance/Cashier) | Balanced security and usability for small store operations | Approved | 1 |
| Separate warehouse/store inventory tracking | Prevents Pitfall 9 (split inventory confusion) | Approved | 2 |
| Manual incentive entry (no auto-calculation) | Business rules not yet defined; flexibility + transparency | Approved | 3 |
| Prisma ORM 7.4 with PostgreSQL for schema + migrations | Type safety, auto-migration generation, query caching prevent N+1 | Implemented | 1 |
| CUID primary keys instead of UUID | Shorter, more readable in logs and API responses | Implemented | 1 |
| Separate refresh_tokens table with hash storage | Token revocation capability and security (never plaintext in DB) | Implemented | 1 |

---
| Phase 01-foundation P03 | 188 | 4 tasks | 3 files |
| Phase 01-foundation P04 | 498 | 6 tasks | 4 files |

## Session Continuity

**Last Session:** 2026-04-14T11:56:19Z to 2026-04-14T11:58:15Z (Plan 01-04)

- Implemented POST /api/users endpoint (create user with validation and SUPERADMIN restriction)
- Implemented GET /api/users endpoint (list users with optional filters, SUPERADMIN restriction)
- Implemented PATCH /api/users/{id} endpoint (update username/role, SUPERADMIN restriction)
- Implemented POST /api/users/{id}/deactivate endpoint (soft delete, audit logging)
- Implemented POST /api/users/{id}/reset-password endpoint (admin password reset)
- Integrated authMiddleware + rbacMiddleware into all endpoints
- Verified build succeeds with all endpoints compiled (Next.js 16.2.3 Turbopack)
- Committed all work: 5edd761
- Created 01-04-SUMMARY.md documenting accomplishments

**Implementations Completed:**

- POST /api/users: Create user with Zod validation (username 3-50 chars, password 12+ chars with uppercase/number)
- GET /api/users: List with filters (?is_active=true, ?role=SUPERADMIN)
- PATCH /api/users/{id}: Update username/role with uniqueness checks
- POST /api/users/{id}/deactivate: Set is_active=false, prevents login
- POST /api/users/{id}/reset-password: Hash and update password
- All operations audit logged (USER_CREATE, USER_EDIT, USER_DEACTIVATE)
- All endpoints return password_hash excluded from responses
- Login endpoint checks is_active before allowing authentication

**Next Session:** Plan 01-05 (`/gsd-execute-phase 01 05`)

- Implement product management endpoints (POST create, GET list)
- Apply same RBAC + audit logging patterns as user management
- Seed database with sample roles and test data

**Context for Next Session:**

- User management CRUD fully implemented with RBAC enforcement
- RBAC middleware pattern proven (used successfully in 5 endpoints)
- Audit logging infrastructure working (USER_CREATE, USER_EDIT, USER_DEACTIVATE)
- Database schema supports soft deletes and audit trail
- Build system verified with API route handlers
- Decisions made: Zod validation at boundary, soft deletes, no before/after in Phase 1 audit logs

---

## Blockers / Risks

**None identified at roadmap stage.**

Potential risks to watch during Phase 1 planning:

- **Database schema design:** Audit table structure critical (immutability, retention, searchability)
- **Testing:** RBAC enforcement needs comprehensive endpoint-level testing
- **Rollout:** All staff need training on new roles and permissions during Phase 1

---

## Notes for Phase Planning

### Phase 1 Planning (Next)

Phase 1 requirements by category:

- **Authentication (3):** Login, session, logout
- **RBAC (4):** Role definitions and API enforcement
- **User Management (5):** CRUD operations for users
- **Product Management (1):** Basic product creation
- **Audit & Accountability (3):** Immutable logging and searchability

**Focus areas for Phase 1 planning:**

1. Database schema: Users, Roles, Products, AuditLog (immutable)
2. Auth middleware: JWT or session-based (decision needed)
3. RBAC middleware: Role checks on every protected endpoint
4. Audit logging: Before/after values, context capture
5. User management UI: Superadmin console for user CRUD

**Risk:** Audit logging is high-stakes (cannot retrofit). Recommend spike on audit table design before full planning.

### Phase 2 Planning (After Phase 1)

Phase 2 requirements by category:

- **Inventory Management (6):** Stock checks, decrements, replenishment, audit
- **Sales Processing (8):** Search, add items, remove items, payment, attribution, receipt, atomicity
- **Product Management (3):** Cost, barcode, catalog
- **Audit & Accountability (1):** Inventory change logging

**Focus areas for Phase 2 planning:**

1. Inventory service: Real-time stock queries, atomic decrements
2. Sales service: Transaction processing, payment handling, receipt generation
3. Database schema: Inventory (store/warehouse), Sales, SalesItems, SalesAttribution
4. Atomic transactions: BEGIN/COMMIT/ROLLBACK workflow
5. POS UI: Barcode scanner, item cart, payment flow

**Risk:** Atomic transactions and race condition prevention are high-stakes. Recommend load testing with concurrent cashiers before launch.

### Phase 3 Planning (After Phase 2)

Phase 3 requirements by category:

- **Reporting (6):** Daily sales, breakdown by staff, margin tracking, reconciliation, admin dashboard, audit trail viewing
- **Incentive Tracking (4):** Manual entry, viewing by staff, audit trail, sales attribution verification
- **Audit & Accountability (2):** Approval workflows, audit trail querying

**Focus areas for Phase 3 planning:**

1. Reporting service: SQL queries for sales aggregations, margins, variance detection
2. Incentive workflows: Superadmin entry → Finance approval → Superadmin sign-off
3. Finance dashboard UI: Charts, tables, filters by date/staff
4. Reconciliation workflows: Daily close-out, cash vs. system, variance alerts
5. Audit querying: Searchable by date, user, operation type

**Risk:** Manual incentive entry without strong validation can lead to overpayment (Pitfall 7). Recommend approval workflow testing with sample data.

---

*State initialized: 2026-04-14*
*Updates: None yet (Phase planning pending)*
