# Requirements: WebStockName

**Defined:** 2026-04-14
**Core Value:** Complete visibility across sales, inventory, and incentives — from customer purchase to payroll settlement.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication & Access Control

- [ ] **AUTH-01**: Staff member can log in with unique username and password
- [ ] **AUTH-02**: System maintains active session across page refreshes
- [ ] **AUTH-03**: Staff member can log out from any page
- [ ] **RBAC-01**: Superadmin role has access to all features and data
- [ ] **RBAC-02**: Finance role has read-only access to sales reports and incentive data
- [ ] **RBAC-03**: Cashier role has access only to inventory checking and sales processing
- [ ] **RBAC-04**: Role-based access is enforced at API endpoint level

### Inventory Management

- [ ] **INV-01**: Cashier can check if product is available at store floor
- [ ] **INV-02**: Cashier can check if product is available in warehouse/backstock
- [ ] **INV-03**: Real-time inventory displays accurate count at all times
- [ ] **INV-04**: Store inventory automatically decreases by 1 when sale completes
- [ ] **INV-05**: Superadmin can manually replenish inventory from warehouse to store
- [ ] **INV-06**: Replenishment transaction is recorded in audit trail with timestamp and user

### Sales Processing

- [ ] **SALE-01**: Cashier can search products by name or scan barcode
- [ ] **SALE-02**: Cashier can add products to transaction with quantity
- [ ] **SALE-03**: Cashier can remove or adjust items before payment
- [ ] **SALE-04**: System calculates subtotal, tax, and total automatically
- [ ] **SALE-05**: Cashier can process payment in cash and card
- [ ] **SALE-06**: Cashier can attribute sale to themselves or select another staff member
- [ ] **SALE-07**: System generates itemized receipt with date, time, and salesperson name
- [ ] **SALE-08**: Inventory decrease happens atomically with sale completion (no split transactions)

### Reporting & Visibility

- [ ] **REPORT-01**: Finance can view daily sales report with all transactions
- [ ] **REPORT-02**: Daily sales report shows total revenue, transaction count, and items sold
- [ ] **REPORT-03**: Finance can view sales breakdown by staff member (who sold what)
- [ ] **REPORT-04**: Finance can see product price and cost for margin calculation
- [ ] **REPORT-05**: Superadmin can view comprehensive dashboard with sales and inventory
- [ ] **REPORT-06**: End-of-day reconciliation report compares register count to system

### Incentive Tracking

- [ ] **INCENT-01**: Superadmin can manually enter incentive amount for each salesperson
- [ ] **INCENT-02**: Finance can view all incentives owed to each staff member
- [ ] **INCENT-03**: Incentive entry is recorded in audit trail with date and approver
- [ ] **INCENT-04**: Sales attribution data is available to finance for incentive verification

### Audit & Accountability

- [ ] **AUDIT-01**: All transactions are recorded with timestamp, user, and action taken
- [ ] **AUDIT-02**: Inventory changes are logged with before/after quantities
- [ ] **AUDIT-03**: User login/logout events are recorded in audit trail
- [ ] **AUDIT-04**: Incentive entries are recorded with who entered it and when
- [ ] **AUDIT-05**: Superadmin can view full audit trail filtered by date range and user
- [ ] **AUDIT-06**: Audit logs cannot be edited or deleted (append-only)

### User Management

- [ ] **USER-01**: Superadmin can create new user accounts with username and password
- [ ] **USER-02**: Superadmin can assign role to each user (cashier, finance, superadmin)
- [ ] **USER-03**: Superadmin can edit user details (name, role)
- [ ] **USER-04**: Superadmin can deactivate user accounts (soft delete, not permanent removal)
- [ ] **USER-05**: Deactivated users cannot log in but their transaction history remains

### Product Management

- [ ] **PROD-01**: Superadmin can create product entries with SKU, name, selling price
- [ ] **PROD-02**: Superadmin can set cost of goods for each product (for margin tracking)
- [ ] **PROD-03**: Superadmin can assign barcode to product for scanning
- [ ] **PROD-04**: Product list is accessible to cashiers for barcode scanning

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Reporting

- **REPORT-07**: Finance can view sales trend analysis (week-over-week, month-over-month)
- **REPORT-08**: Low-stock alerts notify superadmin when inventory falls below threshold
- **REPORT-09**: Daily financial summary showing total revenue, incentives owed, profit margin
- **REPORT-10**: Sales performance rankings/leaderboards by staff member

### Offline & Resilience

- **OFFLINE-01**: Cashier can process transactions if internet connection is lost
- **OFFLINE-02**: Transactions queue locally and sync when connection is restored
- **OFFLINE-03**: Inventory checks show last-known state during offline periods

### Advanced Features

- **ADV-01**: Margin visibility dashboard showing profit by product and by salesperson
- **ADV-02**: Staff incentive dashboard with historical incentive log by salesperson
- **ADV-03**: Export data to CSV format for accounting software integration
- **ADV-04**: Receipt history searchable by date, salesperson, or customer

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Automated incentive calculation | Business rules not yet defined; manual entry is more flexible and transparent |
| Multi-store/chain management | Currently single-store only; adding multi-location support adds 5-10x complexity without current need |
| Advanced ML forecasting/demand prediction | Requires 3+ months historical data; overkill without proven need; threshold-based reordering sufficient |
| Customer loyalty programs | Out of scope for internal operations focus; can be added post-launch if needed |
| Supplier order automation | Removes human oversight of cash flow; manual replenishment sufficient for v1 |
| Push notifications | Email/in-app notifications sufficient; push notifications create alert fatigue |
| Custom report builder | Curated reports cover 80% of needs; can export to CSV if more needed |
| Barcode generation/printing | Assume products have barcodes from suppliers; barcode import sufficient |
| Gift cards/store credit | Adds reconciliation complexity; cash/card payments sufficient for v1 |
| Customer-facing mobile app | Internal operations focus first; mobile consideration deferred to v2+ |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| RBAC-01 | Phase 1 | Pending |
| RBAC-02 | Phase 1 | Pending |
| RBAC-03 | Phase 1 | Pending |
| RBAC-04 | Phase 1 | Pending |
| INV-01 | Phase 2 | Pending |
| INV-02 | Phase 2 | Pending |
| INV-03 | Phase 2 | Pending |
| INV-04 | Phase 2 | Pending |
| INV-05 | Phase 2 | Pending |
| INV-06 | Phase 2 | Pending |
| SALE-01 | Phase 2 | Pending |
| SALE-02 | Phase 2 | Pending |
| SALE-03 | Phase 2 | Pending |
| SALE-04 | Phase 2 | Pending |
| SALE-05 | Phase 2 | Pending |
| SALE-06 | Phase 2 | Pending |
| SALE-07 | Phase 2 | Pending |
| SALE-08 | Phase 2 | Pending |
| REPORT-01 | Phase 3 | Pending |
| REPORT-02 | Phase 3 | Pending |
| REPORT-03 | Phase 3 | Pending |
| REPORT-04 | Phase 3 | Pending |
| REPORT-05 | Phase 3 | Pending |
| REPORT-06 | Phase 3 | Pending |
| INCENT-01 | Phase 3 | Pending |
| INCENT-02 | Phase 3 | Pending |
| INCENT-03 | Phase 3 | Pending |
| INCENT-04 | Phase 3 | Pending |
| AUDIT-01 | Phase 1 | Pending |
| AUDIT-02 | Phase 2 | Pending |
| AUDIT-03 | Phase 1 | Pending |
| AUDIT-04 | Phase 3 | Pending |
| AUDIT-05 | Phase 3 | Pending |
| AUDIT-06 | Phase 1 | Pending |
| USER-01 | Phase 1 | Pending |
| USER-02 | Phase 1 | Pending |
| USER-03 | Phase 1 | Pending |
| USER-04 | Phase 1 | Pending |
| USER-05 | Phase 1 | Pending |
| PROD-01 | Phase 1 | Pending |
| PROD-02 | Phase 2 | Pending |
| PROD-03 | Phase 2 | Pending |
| PROD-04 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 45 total
- Mapped to phases: 45
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-14*
*Last updated: 2026-04-14 after research synthesis*
