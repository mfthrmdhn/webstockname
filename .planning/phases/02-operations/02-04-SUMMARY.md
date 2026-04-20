---
plan: 02-04
phase: 02-operations
status: complete
completed: "2026-04-20"
commits:
  - a01d4a5
  - 0903c9d
---

# Plan 02-04: POS UI

## What Was Built

Full cashier point-of-sale interface connecting all three cashier API endpoints from Plan 02.

## Key Files

### Created
- `app/cashier/layout.tsx` — Cashier layout wrapping with ToastProvider (no AdminNav)
- `app/cashier/pos/page.tsx` — Full two-panel POS UI replacing the Phase 1 placeholder

## Commits

| Commit | Description |
|--------|-------------|
| a01d4a5 | feat(02-04): create cashier layout with ToastProvider |
| 0903c9d | feat(02-04): build full POS UI with two-panel layout, debounced search, cart, checkout |

## Verification

### Must-Haves Met
- [x] Two-panel layout: product search left, cart right
- [x] Debounced search (300ms setTimeout) calls /api/cashier/products
- [x] Clicking search result adds product to cart
- [x] Cart shows name, quantity (+/- buttons), unit price, line subtotal
- [x] Salesperson picker shows CASHIER-role users from /api/cashier/staff
- [x] Payment method selector: Cash / Card / Transfer; Cash shows amount-received + change due
- [x] Checkout button disabled until cart has items AND salesperson selected AND cash amount valid
- [x] Confirmation screen after successful checkout with sale details
- [x] Dismiss confirmation starts new sale (cart clears)

## Self-Check: PASSED
