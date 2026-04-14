# WebStockName

## What This Is

A single-store inventory and sales management system that provides end-to-end visibility from point of sale through financial tracking to staff payroll. Staff can check real-time stock availability (store vs warehouse), process sales with accurate salesperson attribution, and the finance team can review sales performance, profit margins, and incentive tracking.

## Core Value

Complete visibility across sales, inventory, and incentives — from customer purchase to payroll settlement.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **INV-01**: Cashier can check if product is available at store or warehouse
- [ ] **INV-02**: Store inventory automatically decreases when sale is completed
- [ ] **INV-03**: Superadmin can manually replenish stock from warehouse to store
- [ ] **SALE-01**: Cashier can process a sale and ring up customer
- [ ] **SALE-02**: Cashier can attribute sale to themselves or another store staff member
- [ ] **SALE-03**: Finance can view daily sales report with product details
- [ ] **SALE-04**: Finance can see sales attributed to each staff member
- [ ] **FIN-01**: Finance can see product price and profit margin for each sale
- [ ] **INCENT-01**: Superadmin can manually enter incentive amounts for salespeople
- [ ] **INCENT-02**: Finance can view all incentives given to each staff member
- [ ] **RBAC-01**: Superadmin role can manage all users
- [ ] **RBAC-02**: Superadmin role can set up and modify workflows
- [ ] **RBAC-03**: Superadmin role can approve payroll
- [ ] **RBAC-04**: Finance role has read-only access to sales and incentive data
- [ ] **RBAC-05**: Cashier role has access to stock checking and sales processing only

### Out of Scope

- Multi-store/chain management — Single store only
- Automated incentive calculation — Manual entry only for now
- Automated warehouse-to-store restocking workflows — Manual replenishment only
- Customer-facing features — Internal operations only

## Context

This system solves a critical operations gap for retail stores: currently there's no connected visibility between point-of-sale transactions, inventory status, and staff compensation. The three user roles have distinct but interconnected workflows that must work seamlessly together.

**Key workflows:**
- Cashiers need to answer "is it in stock?" instantly and process sales
- Finance needs comprehensive daily reporting to track performance and margins
- Superadmin needs control over users, workflows, and approval authority

The system is being built for a single store initially, leaving room for multi-store expansion later.

## Constraints

- **Scope**: Single store only (no multi-location support in v1)
- **Incentives**: Manual entry only — no automated commission calculation in v1
- **Restocking**: Manual updates to inventory — no automated warehouse-to-store workflows

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single-store focus | Simpler to launch and validate with real users before scaling | — Pending |
| Manual incentive entry | Allows flexibility and avoids complex business logic initially | — Pending |
| Automatic inventory decrease on sale | Keeps stock accurate without extra work from cashiers | — Pending |

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
*Last updated: 2026-04-14 after initialization*
