# Phase 4: Product Management CRUD Operations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 04-product-management-crud-operations-implement-edit-and-delete
**Mode:** discuss
**Areas discussed:** Edit scope & safety, Delete strategy, Edit UX design, Audit & compliance

---

## Edit Scope & Safety

### Question: Which product fields should superadmin be able to edit?

| Option | Description | Selected |
|--------|-------------|----------|
| Name & description only | Only allow cosmetic changes. Immobilize pricing and SKU. | |
| Name, price, and cost | Allow price/cost edits. Immobilize SKU and quantities. | |
| All fields except SKU | SKU is immutable. Everything else editable. | |
| All fields including SKU | Full flexibility. Can change anything. | ✓ |

**User's choice:** All fields including SKU  
**Rationale:** Full flexibility for superadmin. Audit trail provides accountability.

---

### Question: If a product has existing sales, how should edits be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Allow edits freely, log everything | No restrictions. Changes apply immediately. Audit log shows what changed. | ✓ |
| Warn but allow | Show confirmation modal before allowing changes. | |
| Lock prices, allow name-only edits | Prices become read-only if product has sales. | |
| Prevent edits entirely | Products with sales become read-only. | |

**User's choice:** Allow edits freely, log everything  
**Rationale:** Phase 2 price snapshots mean editing current prices doesn't affect historical margins.

---

### Question: How should the edit form be organized?

| Option | Description | Selected |
|--------|-------------|----------|
| Single column, all fields stacked | Simple vertical list. | |
| Two-column layout with sections | Left: Product Info. Right: Pricing & Inventory. | ✓ |
| Tabs or sections | Separate tabs for Basic, Pricing, Inventory. | |

**User's choice:** Two-column layout with sections  
**Notes:** Show pre-edited values (before/after comparison visible)

---

## Delete Strategy

### Question: How should product deletion work?

| Option | Description | Selected |
|--------|-------------|----------|
| Soft delete (is_active flag) | Add is_active boolean. Deletion sets is_active = false. | |
| Hard delete, no restrictions | Delete entirely. Fast, clean. | |
| Hard delete, but only if no sales | Prevent deletion if product has sales. | ✓ |
| Archive instead | Move to archive table. | |

**User's choice:** Hard delete, but only if no sales  
**Rationale:** Prevents accidental deletion of products with historical data.

---

### Question: When deletion is blocked (product has sales), what's the user experience?

| Option | Description | Selected |
|--------|-------------|----------|
| Error message only | Show error. No alternatives. | |
| Error + suggest soft-delete | Show error and offer one-click soft-delete. | ✓ |
| Auto soft-delete as fallback | Auto-convert to soft-delete if hard delete blocked. | |

**User's choice:** Error + suggest soft-delete  
**Rationale:** Give superadmin a clear alternative path forward.

---

## Edit UX Design

### Question: How should superadmin edit products?

| Option | Description | Selected |
|--------|-------------|----------|
| Modal dialog in the product list | Click Edit → modal form opens. Fast, no navigation. | ✓ |
| Separate dedicated edit page | /admin/products/{id}/edit page. More space. | |
| Inline editing in the table | Click cell → edit in-place. Fastest but limited space. | |
| All of the above | User chooses which to use. | |

**User's choice:** Modal dialog in the product list

---

### Question: Delete confirmation dialog: what should it show?

| Option | Description | Selected |
|--------|-------------|----------|
| Simple confirmation | "Are you sure?" — Yes / Cancel. | |
| Confirmation + consequence info | Show sales count and impact explanation. | ✓ |
| Type product name to confirm | High friction, prevents accidents. | |

**User's choice:** Confirmation + consequence info  
**Rationale:** Users should know impact (X sales in history) before confirming.

---

## Audit & Compliance

### Question: Which product operations should be audit-logged?

| Option | Description | Selected |
|--------|-------------|----------|
| Edit and delete only | Log PRODUCT_UPDATE and PRODUCT_DELETE. | ✓ |
| All operations including views | Log CREATE, READ, UPDATE, DELETE. | |
| Edits only (not views or deletes) | Log updates; skip reads and deletes. | |

**User's choice:** Edit and delete only

---

### Question: What should the audit log capture for product edits?

| Option | Description | Selected |
|--------|-------------|----------|
| All changed fields only | Only log fields that changed. Smaller logs. | ✓ |
| All product fields always | Complete before/after snapshot always. Better for compliance. | |
| Key fields only | Always log name, SKU, prices; skip quantities. | |

**User's choice:** All changed fields only  
**Rationale:** Reduced log size, focuses on actual changes.

---

## Claude's Discretion

Areas where superadmin has flexibility during implementation:
- Exact modal styling and animations
- Form validation error messages and real-time validation
- Toast notification copy for success/failure
- How to handle SKU uniqueness checks if user changes SKU to duplicate
- Index strategy for product searches
- Whether to include a "change summary" preview before confirm

