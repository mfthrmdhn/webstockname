# Phase 4: Product Management CRUD Operations - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Superadmin can edit and delete products with full audit trail. Product lifecycle is managed safely with historical data integrity (sales with existing prices are unaffected by subsequent edits; deletions are prevented if products have sales history).

This phase covers:
- Edit modal for products (all fields editable including SKU)
- Delete with safety checks (hard delete only if no sales; suggest soft-delete alternative)
- Audit logging for PRODUCT_UPDATE and PRODUCT_DELETE actions
- Before/after value capture for accountability
- Safety warnings and confirmation flows

Depends on Phase 3 for reporting context (helps understand why price snapshots at sale time prevent margin impact when products are edited).

</domain>

<decisions>
## Implementation Decisions

### Edit Scope & Flexibility
- **D-01:** All product fields are editable: name, SKU, selling_price, cost, store_qty, warehouse_qty
  - SKU can change (may need foreign key handling in other tables if added later)
  - Prices can change at any time without restriction
  - Quantities can be adjusted (inventory replenishment is separate; this is for correction/adjustment)

- **D-02:** No restrictions on editing products with sales history
  - Historical sales use price snapshots from Phase 2 (sale-time prices), so editing current prices does NOT affect margin calculations for past sales
  - Trust the audit trail for accountability
  - Simplifies implementation (no conditional logic)

### Delete Strategy
- **D-03:** Hard delete (permanent removal) with a safety gate: deletion is only permitted if the product has NO sales history
  - Query: Check if any Sale records reference this product
  - If sales exist: reject with error message + suggest soft-delete alternative

- **D-04:** When hard delete is blocked (product has sales), the UX flow is:
  - Show error dialog: "Cannot delete [Product Name] — this product has [X] sales in history"
  - Offer alternative: "Make it inactive instead (won't appear in POS, but keeps history)"
  - One-click soft-delete button: sets is_active = false on Product table

### Edit UI & UX
- **D-05:** Edit modal dialog (not separate page, not inline editing)
  - Triggered by "Edit" button on each product row in the /admin/products page
  - Modal contains the edit form
  - Modal closes on success; product list refreshes to show updated values

- **D-06:** Two-column modal form layout with visual grouping:
  - **Left column:** Product Info
    - Name (text input)
    - SKU (text input)
  - **Right column:** Pricing & Inventory
    - Selling Price (decimal input)
    - Cost (decimal input)
    - Store Qty (integer input)
    - Warehouse Qty (integer input)
  - Form shows pre-edited value next to each field (before/after visibility)

- **D-07:** Delete confirmation dialog structure:
  - Text: "Delete [Product Name]?"
  - Additional context: "This product has [X] sales in history. Deletion is permanent but won't affect past reports (they use sale-time prices)."
  - Buttons: "Delete" (destructive, red) / "Cancel"
  - No friction (no forced text-entry confirmation — modal is explicit enough)

### Audit Logging
- **D-08:** Extend AuditLog schema from Phase 1 with new action types:
  - PRODUCT_UPDATE: triggered on PATCH/PUT endpoint
  - PRODUCT_DELETE: triggered on DELETE endpoint (rare, only if no sales)

- **D-09:** For PRODUCT_UPDATE, capture only changed fields (not all fields):
  - Example: If only price changed, before_values = {selling_price: 10.00}, after_values = {selling_price: 12.00}
  - If name and price both changed: before_values = {name: "Old Name", selling_price: 10.00}, after_values = {name: "New Name", selling_price: 12.00}
  - Reduces log size, focuses on what actually changed

- **D-10:** For PRODUCT_DELETE, log:
  - resource_type = "Product"
  - resource_id = product.id
  - before_values = full product snapshot (name, SKU, prices, quantities)
  - after_values = null (product is deleted)

### Claude's Discretion
- Exact modal styling (shadcn/ui Dialog component, width, padding)
- Form validation error messages and real-time validation
- Specific toast notification copy for success/failure
- How to handle SKU uniqueness checks if SKU is changed to an existing SKU (reject or warn)
- Whether to show a "Change Summary" section before confirm (nice-to-have)
- Index strategy for product searches if needed
- Debounce/validation timing for price/qty inputs

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 4 Requirements
- `.planning/ROADMAP.md` (Phase 4 description, line 160-166) — Product management CRUD operations, edit/delete endpoints, audit logging for PRODUCT_UPDATE and PRODUCT_DELETE

### Phase 1 Foundation (Carry Forward)
- `.planning/phases/01-foundation/01-CONTEXT.md` (D-09 through D-11) — AuditLog schema, append-only enforcement, logAction pattern
- `.planning/phases/01-foundation/01-CONTEXT.md` (D-05) — RBAC middleware pattern (superadmin-only endpoints)
- `.planning/phases/01-foundation/01-CONTEXT.md` (D-07) — Soft-delete pattern (is_active flag reused for products)

### Phase 2 Operations (Carry Forward)
- `.planning/phases/02-operations/02-CONTEXT.md` (D-04 through D-06) — Product data model (selling_price, cost, store_qty, warehouse_qty fields)
- `.planning/phases/02-operations/02-CONTEXT.md` (D-06) — Price snapshot at sale time (context for why editing current prices is safe)

### Technology Stack & Security
- `CLAUDE.md` (lines 18-45) — Locked tech stack: Next.js 16, Express.js, PostgreSQL, Prisma 7.4+
- `CLAUDE.md` (lines 151-156) — Security defaults: HttpOnly cookies, Secure + SameSite flags

### Requirements & Dependencies
- `.planning/REQUIREMENTS.md` (PROD-01 through PROD-04) — Product management scope for v1
- `.planning/ROADMAP.md` (Phase 3 dependency note) — Phase 4 depends on Phase 3 for reporting context

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (from Phase 1 & 2)
- `middleware/rbac.ts` — Superadmin-only RBAC check (apply to PATCH/DELETE endpoints)
- `lib/audit/logger.ts` (`logAction`) — Extend with PRODUCT_UPDATE and PRODUCT_DELETE action types
- `components/ui/Dialog` — Modal dialog component (use for edit form)
- `components/ui/Input`, `Select`, `Button` — Form field components
- `components/AdminNav.tsx` — "Products" link already exists; edit/delete are actions within the products page

### Established Patterns
- API routes wrap requests with `authMiddleware` + `rbacMiddleware` before business logic
- Zod schema validation on all API inputs
- Prisma transactions for multi-step operations
- CUID primary keys on all models
- Soft-delete pattern: is_active boolean (established in Phase 1, reused in Phase 2)

### Integration Points
- `prisma/schema.prisma` — Add is_active field to Product model (if not already present from Phase 2)
- `app/admin/products/page.tsx` — Existing product list page; add Edit button to each row
- New PATCH `/api/products/{id}` endpoint
- New DELETE `/api/products/{id}` endpoint
- Extend `logAction` utility with new action types

</code_context>

<specifics>
## Specific Ideas

- Edit modal should show "Original: [value]" next to current field so superadmin can see what was there before
- Delete confirmation should warn about sales impact (even though deletion won't affect past reports)
- Success toast after edit/delete: "Product updated" / "Product deleted (soft)"
- If user tries to delete a product with sales, the error message includes count: "Cannot delete — this product has 15 sales"

</specifics>

<deferred>
## Deferred Ideas

- Bulk edit/delete (edit multiple products at once) — would be a separate phase
- Product import/export — out of scope for v1
- Archive view (to see soft-deleted products) — Phase 3+ if needed
- Undo capability after delete — deletion is intentional; undo adds complexity
- Product variants (colors, sizes) — would be a new capability, separate phase
- Category management — out of scope for v1 (products are flat list only)

</deferred>

---

*Phase: 04-product-management-crud-operations-implement-edit-and-delete*
*Context gathered: 2026-04-22*
