# Phase 2: Operations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 02-operations
**Areas discussed:** POS Layout, Inventory Data Model, Payment Methods, Sales Attribution, Inventory Replenishment

---

## POS UI Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Search + cart panel | Left: search/SKU input + filtered product list. Right: running cart with totals and checkout. | ✓ |
| Product grid browse | Grid of product cards to tap/click; better for few products | |

**User's choice:** Search + cart panel
**Notes:** Two-panel layout. Fast for text/SKU-based lookup, scalable to large catalogs.

---

## Inventory Data Model

| Option | Description | Selected |
|--------|-------------|----------|
| Extend Product + Inventory table | Add price/cost to Product; separate Inventory table for qty | |
| Add everything to Product | selling_price, cost, store_qty, warehouse_qty all on Product model | ✓ |

**User's choice:** Add everything to Product
**Notes:** Simpler schema. Accepted trade-off: catalog and stock data in one table. Suitable for single-store MVP.

---

## Payment Methods

| Option | Description | Selected |
|--------|-------------|----------|
| Cash only | Amount received → change calculation | |
| Cash + card/transfer | Payment method selector (Cash/Card/Transfer); no gateway | ✓ |

**User's choice:** Cash + Card/Transfer
**Notes:** No gateway integration — cashier records method only. Cash gets change calculation; Card/Transfer do not.

---

## Sales Attribution

| Option | Description | Selected |
|--------|-------------|----------|
| Cashier attributes to themselves | Auto-credit logged-in cashier | |
| Cashier picks salesperson | Explicit picker before checkout | ✓ |

**Follow-up — who's in the picker list?**

| Option | Description | Selected |
|--------|-------------|----------|
| All active staff | Any role can be credited | |
| Cashiers only | Only CASHIER-role users appear | ✓ |

**User's choice:** Cashier picks from CASHIER-role users only
**Notes:** Attribution is required (blocking), immutable after confirmation.

---

## After Checkout

| Option | Description | Selected |
|--------|-------------|----------|
| On-screen confirmation + clear cart | Success screen with sale details; cashier dismisses | ✓ |
| Silent clear | Cart resets immediately | |

**User's choice:** On-screen confirmation + clear cart
**Notes:** No printer. Shows total, items, salesperson, payment method.

---

## Inventory Replenishment

| Option | Description | Selected |
|--------|-------------|----------|
| New /admin/inventory page | Dedicated page with product table + Add Stock action | ✓ |
| Inline on /admin/products | Add replenishment to existing product management page | |

**User's choice:** New dedicated /admin/inventory page
**Notes:** Product + qty to move + required reason/note. Reason field is mandatory.

---

## Deferred Ideas

- Barcode scanner hardware — SKU text input handles same use case
- Printed/emailed receipts — no printer integration Phase 2
- Payment gateway — method recorded only
- Low-stock alerts — Phase 3
