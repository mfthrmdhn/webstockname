# WebStockName

## What This Is

A single-store inventory and sales management system that provides end-to-end visibility from point of sale through financial tracking to staff payroll. Staff can check real-time stock availability (store vs warehouse), process sales with accurate salesperson attribution, and the finance team can review sales performance, profit margins, and incentive tracking.

## Core Value

Complete visibility across sales, inventory, and incentives — from customer purchase to payroll settlement.

## Requirements

### Validated (v1.0 — 2026-05-02)

✅ **INV-01**: Cashier can check if product is available at store or warehouse
✅ **INV-02**: Store inventory automatically decreases when sale is completed
✅ **INV-03**: Superadmin can manually replenish stock from warehouse to store
✅ **SALE-01**: Cashier can process a sale and ring up customer
✅ **SALE-02**: Cashier can attribute sale to themselves or another store staff member
✅ **SALE-03**: Finance can view daily sales report with product details
✅ **SALE-04**: Finance can see sales attributed to each staff member
✅ **FIN-01**: Finance can see product price and profit margin for each sale
✅ **INCENT-01**: Superadmin can manually enter incentive amounts for salespeople
✅ **INCENT-02**: Finance can view all incentives given to each staff member
✅ **RBAC-01**: Superadmin role can manage all users
✅ **RBAC-02**: Superadmin role can set up and modify workflows
✅ **RBAC-03**: Superadmin role can approve payroll (via role enforcement)
✅ **RBAC-04**: Finance role has read-only access to sales and incentive data
✅ **RBAC-05**: Cashier role has access to stock checking and sales processing only

### Active

(None — v1.0 complete, v1.1 to be defined)

### Out of Scope

- Multi-store/chain management — Single store only
- Automated incentive calculation — Manual entry only for now
- Automated warehouse-to-store restocking workflows — Manual replenishment only
- Customer-facing features — Internal operations only

## Current State (v1.0 — May 2026)

**Shipped:** Complete inventory and sales management system with role-based access, atomic transactions, and full audit trails.

**Key Features Delivered:**
- JWT-based authentication with role-based access control (Superadmin, Finance, Cashier)
- Atomic sales processing with inventory validation and price snapshots
- Real-time inventory management (store vs warehouse tracking)
- Financial reporting with margin calculation and staff breakdown
- Immutable audit logging of all operations
- Product management with edit/delete operations and soft-delete fallback

**Technology:** Next.js 16 + React 19, PostgreSQL 16, Prisma ORM 7.4, TypeScript  
**Test Coverage:** 146 automated tests, 100% pass rate  
**Deployment:** Ready for Vercel or self-hosted Node.js  

---

## Context

This system solves a critical operations gap for retail stores: currently there's no connected visibility between point-of-sale transactions, inventory status, and staff compensation. The three user roles have distinct but interconnected workflows that must work seamlessly together.

**Key workflows:**
- Cashiers need to answer "is it in stock?" instantly and process sales atomically
- Finance needs comprehensive daily reporting to track performance, margins, and reconciliation
- Superadmin needs control over users, products, incentives, and audit trails

The v1.0 system is built for a single store, leaving room for multi-location expansion and advanced features (caching, notifications, etc.) in future versions.

## Constraints

- **Scope**: Single store only (no multi-location support in v1)
- **Incentives**: Manual entry only — no automated commission calculation in v1
- **Restocking**: Manual updates to inventory — no automated warehouse-to-store workflows

## Key Decisions

| Decision | Rationale | Outcome | Phase |
|----------|-----------|---------|-------|
| Single-store focus | Simpler to launch and validate with real users before scaling | ✅ Validated in v1.0 (works well for MVP) | 1 |
| Manual incentive entry | Allows flexibility and avoids complex business logic initially | ✅ Works; gives superadmin full control | 3 |
| Automatic inventory decrease on sale | Keeps stock accurate without extra work from cashiers | ✅ Implemented atomically with transactions | 2 |
| Immutable audit logging from day 1 | Cannot retrofit without data loss; compliance critical | ✅ Complete audit trail, zero gaps | 1 |
| Atomic sales + inventory transactions | Prevents race conditions and inventory desync | ✅ Verified; prevents double-sells | 2 |
| Price snapshots at sale time | Edits don't affect past margin calculations | ✅ Historical integrity preserved | 2 |
| JWT + HttpOnly cookies | Stateless auth, refresh token revocation | ✅ Secure and scalable | 1 |
| Role-based middleware enforcement | Access control at API layer, not UI | ✅ Type-safe via TypeScript | 1 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-02 after v1.0 milestone completion*
