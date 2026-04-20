# Phase 2: Operations - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Cashiers can process sales with real-time inventory visibility, and inventory decreases atomically with sale completion without data loss or race conditions.

This phase covers:
- POS interface for cashiers (search products, build cart, checkout)
- Sales attribution (cashier selects which salesperson gets credit)
- Payment method recording (cash, card, or transfer — no gateway)
- Inventory schema extension (pricing + stock quantities)
- Atomic sale + inventory decrement in single database transaction
- Inventory replenishment UI (superadmin moves warehouse → store stock)
- Audit logging for all inventory and sale state changes

Finance reporting (Phase 3) and incentive tracking (Phase 3) depend on the sale and inventory records created here.

</domain>

<decisions>
## Implementation Decisions

### POS UI Layout
- **D-01:** Two-panel layout: left panel = product search (by name or SKU text input, live-filtered list), right panel = running cart with items, quantities, subtotals, and checkout button
- **D-02:** Cashier types into search bar to find products; clicking a result adds it to cart; quantity can be adjusted in-cart
- **D-03:** After checkout, show an on-screen confirmation screen with sale total, items sold, salesperson credited, and payment method. Cashier dismisses it to start a new sale. No printer integration.

### Product Data Model
- **D-04:** Add `selling_price` (Decimal) and `cost` (Decimal) to the existing Product model. These are required fields — no product should exist without pricing for margin calculations in Phase 3.
- **D-05:** Add `store_qty` (Int, default 0) and `warehouse_qty` (Int, default 0) directly to the Product model. No separate Inventory table — keep it simple for Phase 2.
- **D-06:** `selling_price` and `cost` must be captured on the Sale record at time of sale (snapshot), not looked up from Product at report time. Prices change; historical margins must reflect what was actually charged.

### Payment Methods
- **D-07:** Payment method selector at checkout with three options: Cash / Card / Transfer. No payment gateway integration — cashier records the method only.
- **D-08:** For Cash payments, cashier enters amount received and system displays change due. Card and Transfer payments have no amount-received field.

### Sales Attribution
- **D-09:** Cashier must explicitly pick a salesperson before completing checkout. No auto-attribution to logged-in cashier.
- **D-10:** Salesperson picker shows only active users with the CASHIER role. Finance and Superadmin roles are excluded from the picker list.
- **D-11:** Attribution is recorded at sale time and is immutable after confirmation (no editing after sale completes).

### Inventory Replenishment
- **D-12:** Dedicated `/admin/inventory` page in the superadmin panel. Shows a table of all products with current store_qty and warehouse_qty. Each row has an "Add stock" action.
- **D-13:** Replenishment form: product (pre-selected from row), quantity to move (warehouse → store), and a required reason/note field. Submitted via POST; inventory updates atomically; audit log entry created.

### Atomic Transactions
- **D-14:** Sale completion and inventory decrement happen in a single Prisma transaction: create Sale record + SaleItems + decrement store_qty. If any step fails, entire transaction rolls back.
- **D-15:** Before sale completes, validate that store_qty >= total quantity ordered. If not, reject with a clear error: "Only X in stock — cannot complete sale."
- **D-16:** store_qty never goes negative. Constraint enforced at application layer (pre-check) and ideally as a database CHECK constraint.

### Audit Logging
- **D-17:** Extend the existing `logAction` utility to support new action types: SALE_CREATE, INVENTORY_REPLENISH, INVENTORY_ADJUST. Follow the same AuditLog schema from Phase 1.
- **D-18:** Sale audit entry: records sale_id, cashier_id, salesperson_id, total, payment_method, item count.
- **D-19:** Replenishment audit entry: records product_id, qty_moved, reason, superadmin_id, before/after quantities.

### Claude's Discretion
- Exact search debounce timing (suggest 300ms)
- Cart quantity increment/decrement UI (+ / - buttons vs direct input)
- Confirmation screen design and dismiss behavior
- Prisma transaction isolation level (default READ COMMITTED is fine)
- Specific error message copy for insufficient stock
- Index strategy for Product name search (suggest GIN index or ILIKE with name index)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 2 Requirements
- `.planning/ROADMAP.md` (lines 39-57) — Phase 2 goal, success criteria (6 items), atomic transaction non-negotiable
- `.planning/REQUIREMENTS.md` — INV-01 through INV-06, SALE-01 through SALE-08, PROD-02/03/04, AUDIT-02
- `.planning/PROJECT.md` — Constraints: single store, manual replenishment only, no automated workflows

### Foundation (Phase 1 — carry forward)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-04 (RBAC roles), D-05 (RBAC middleware pattern), D-09 (AuditLog schema), D-11 (logAction pattern), D-12 (Prisma patterns)
- `CLAUDE.md` (lines 18-45) — Tech stack: Next.js 16, Prisma 7.4+, PostgreSQL, JWT auth

### Architecture Decisions
- `.planning/ROADMAP.md` (lines 108-115) — Atomic inventory transactions non-negotiable; row-level locking, no partial updates
- `.planning/ROADMAP.md` (lines 116-120) — Sales attribution immutability: recorded at sale time, no retroactive changes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `middleware/auth.ts` + `middleware/rbac.ts` — Apply to all new API routes (inventory, sales, replenishment)
- `lib/audit/logger.ts` (`logAction`) — Extend with new action types; same call pattern
- `components/ui/` — Button, Input, Label, Select, Table, Dialog all available; use for POS UI and replenishment form
- `components/AdminNav.tsx` — Add "Inventory" link for the new /admin/inventory page
- `app/admin/layout.tsx` — New admin pages inherit this layout automatically

### Established Patterns
- API routes use `authMiddleware` + `rbacMiddleware` before any business logic (see `app/api/products/route.ts`)
- Zod schema validation on all API inputs before DB operations
- Prisma client via `import('@/lib/db').default` (dynamic import pattern established)
- CUID primary keys on all models

### Integration Points
- `prisma/schema.prisma` — Needs new fields on Product + new Sale/SaleItem models
- `app/cashier/pos/page.tsx` — Placeholder exists, ready to implement
- `app/finance/` — Reports page (placeholder) will consume Sale records created here
- `app/admin/` layout + nav — Inventory page slots in here

</code_context>

<specifics>
## Specific Ideas

- POS search should feel instant — cashier shouldn't wait; debounce + optimistic UI
- The salesperson picker must be a required step, not optional — sale cannot proceed without attribution
- Replenishment reason field is required (not optional) — supports audit accountability
- Price snapshot on sale record is critical: Finance Phase 3 margin reports use sale-time prices, not current Product prices

</specifics>

<deferred>
## Deferred Ideas

- Barcode scanner hardware integration — not in scope for Phase 2 (SKU text input covers the same use case)
- Printed receipt / receipt email — no printer integration in Phase 2
- Card payment gateway (Stripe/Square) — D-07 records method only; gateway integration is Phase 3+ if needed
- Low-stock alerts — Phase 3 (reporting/intelligence phase)
- Bulk inventory import — out of scope for v1
- Multi-salesperson split attribution — single salesperson per sale only

</deferred>

---

*Phase: 02-operations*
*Context gathered: 2026-04-20*
