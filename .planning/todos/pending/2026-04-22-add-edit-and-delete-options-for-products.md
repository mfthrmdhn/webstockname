---
created: 2026-04-22T10:16:29.770Z
title: Add edit and delete options for products
area: ui
files:
  - app/admin/products/page.tsx
  - app/api/products/route.ts
---

## Problem

The admin products page currently displays a list of products but lacks the ability to edit or delete items. Users must navigate elsewhere or manually manage products through the database. This limits the usability of the admin interface and creates a gap in product lifecycle management (CRUD operations).

## Solution

Implement edit and delete functionality for products:
1. Add action buttons (Edit, Delete) to the products table in `/app/admin/products/page.tsx`
2. Create edit modal/form for updating product details (name, SKU, price, cost, category)
3. Implement DELETE endpoint in `/app/api/products/route.ts` with proper authorization checks (SUPERADMIN only)
4. Add confirmation dialog for destructive delete action
5. Update client-side to handle edit form submission and delete requests
6. Ensure proper RBAC enforcement (only SUPERADMIN can edit/delete)
7. Add audit logging for product modifications and deletions

**Related Requirements:** PROD-01 (product management), RBAC-01 (authorization), AUDIT-01 (audit trail)
