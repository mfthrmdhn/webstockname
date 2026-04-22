# Codebase Concerns

**Analysis Date:** 2026-04-22

## Tech Debt

**Access token stored in localStorage:**
- Issue: The access token JWT is stored in `localStorage`, which is vulnerable to XSS attacks. Any injected script can steal the token.
- Files: `lib/auth/client.ts` (line 17: `localStorage.setItem('accessToken', accessToken)`), `app/admin/users/page.tsx` (line 92: `localStorage.getItem('accessToken')`), `app/admin/audit/page.tsx` (line 77: `localStorage.getItem('accessToken')`)
- Impact: Compromised token allows full impersonation of the logged-in user for 15 minutes. Finance and superadmin roles are highest risk.
- Fix approach: Move access token to a short-lived HttpOnly cookie (same pattern already used for refresh tokens). The login endpoint already sets `access_token` as a non-HttpOnly cookie on line 83 — this is redundant with localStorage and the HttpOnly flag is missing. Decide on one mechanism (HttpOnly cookie), remove localStorage path, and update all `getAccessToken()` callers.

**Inconsistent token retrieval: `getAccessToken()` vs raw `localStorage.getItem`:**
- Issue: Most admin pages bypass `lib/auth/client.ts#getAccessToken()` and call `localStorage.getItem('accessToken')` directly. POS page uses the helper. Creates two divergent patterns.
- Files: `app/admin/users/page.tsx`, `app/admin/audit/page.tsx`, `app/finance/reports/page.tsx` (direct localStorage) vs `app/cashier/pos/page.tsx` (uses `getAccessToken()`)
- Impact: If the storage key or mechanism ever changes, direct callers will silently break (no token → silent auth failure).
- Fix approach: Enforce `getAccessToken()` from `lib/auth/client.ts` everywhere. Search for `localStorage.getItem('accessToken')` and replace.

**Shared JWT secret for both access and refresh tokens:**
- Issue: `lib/auth/jwt.ts` uses the same `JWT_SECRET` for both `generateAccessToken` and `generateRefreshToken`. If the secret leaks, both token types are compromised.
- Files: `lib/auth/jwt.ts`
- Impact: A stolen access token cannot be independently rotated without invalidating all refresh tokens too.
- Fix approach: Introduce a second env var `JWT_REFRESH_SECRET` used exclusively for refresh token signing and verification.

**Fallback JWT secret in code:**
- Issue: `lib/auth/jwt.ts` line 3 falls back to `'dev-secret-change-in-production'` when `JWT_SECRET` is unset. If deployed without the env var, a known secret is in production.
- Files: `lib/auth/jwt.ts`
- Impact: Attacker can forge valid tokens for any user/role.
- Fix approach: Remove fallback entirely. Throw an error at module load time if `JWT_SECRET` is not set.

**`where: any` typed Prisma queries:**
- Issue: Several API routes type the Prisma `where` clause as `any`, bypassing TypeScript's type checking.
- Files: `app/api/users/route.ts` (line 144), `app/api/audit/route.ts` (line 37), `app/api/products/route.ts` (line 109)
- Impact: Typos in query field names will silently return wrong results instead of compile-time errors.
- Fix approach: Replace `any` with the Prisma-generated `WhereInput` type (e.g., `Prisma.UserWhereInput`).

**Prisma dynamic import on every request:**
- Issue: Every API route does `const prisma = (await import('@/lib/db')).default` inside the request handler. This is unnecessary — `lib/db.ts` already implements the global singleton pattern.
- Files: All routes under `app/api/`
- Impact: Minor: no runtime correctness issue due to module caching, but the pattern is misleading and adds latency on first cold load.
- Fix approach: Import prisma at module top level: `import prisma from '@/lib/db'`.

**Roles list hardcoded in frontend:**
- Issue: `app/admin/users/page.tsx` line 76 hardcodes `['SUPERADMIN', 'FINANCE', 'CASHIER']` as available roles instead of fetching from `/api/roles` or similar.
- Files: `app/admin/users/page.tsx`
- Impact: If roles change in the database, the UI does not reflect it without a code change.
- Fix approach: Fetch roles from the API or define them in a shared constant file.

**No refresh token rotation:**
- Issue: `app/api/auth/refresh/route.ts` issues a new access token but does NOT rotate (replace) the refresh token. The same refresh token is valid for its full 7-day lifetime even after use.
- Files: `app/api/auth/refresh/route.ts`
- Impact: Stolen refresh tokens remain valid indefinitely until expiry; token theft is undetectable.
- Fix approach: On each refresh, delete the old `RefreshToken` record, create a new one, and return the new refresh token cookie.

**No rate limiting on auth endpoints:**
- Issue: `/api/auth/login` and `/api/auth/refresh` have no rate limiting or brute-force protection.
- Files: `app/api/auth/login/route.ts`, `app/api/auth/refresh/route.ts`
- Impact: Password brute-force and token replay attacks are unrestricted.
- Fix approach: Add rate limiting middleware (e.g., via Next.js middleware or Upstash Redis rate limiter) on the `/api/auth/*` routes.

**Stale cart stock data in POS:**
- Issue: When a cashier adds a product to cart, `storeQty` is captured at search time. If another cashier sells stock between then and checkout, the frontend will not show the updated quantity. The backend transaction correctly enforces the constraint, but the cashier sees a misleading quantity in the UI.
- Files: `app/cashier/pos/page.tsx` (line 124: `storeQty: product.storeQty`)
- Impact: Confusing UX when checkout fails due to stock error that was not visible in cart.
- Fix approach: Either re-fetch product stock on checkout submission or add a real-time stock subscription (Phase 2 Redis feature).

**`itemCount` in Sale is derived data that can drift:**
- Issue: `Sale.itemCount` stores `items.length` (number of cart lines), not total units. This is redundant with `SaleItem` records and can diverge if items are deleted or altered post-sale.
- Files: `app/api/cashier/sales/route.ts` (line 93), `prisma/schema.prisma` (line 107)
- Impact: Reporting that relies on `itemCount` may be inaccurate if the field is ever used as a shortcut.
- Fix approach: Remove `itemCount` from the schema and compute it from `SaleItem` aggregation in queries, or at minimum document it as a denormalized snapshot.

## Known Bugs

**`isActive` field missing from `updatedUser` in users page:**
- Symptoms: After editing a user (username/role), the local state update merges `updatedUser` from the API response. The PATCH response shape may not include `isActive`, causing the status badge to disappear or show stale data.
- Files: `app/admin/users/page.tsx` (line 208)
- Trigger: Edit any user and observe the Status column immediately after update.
- Workaround: Refresh the page.

**`canCheckout` does not validate cart quantities against current stock:**
- Symptoms: Cashier can attempt checkout with more items than `storeQty` shows in cart (if quantities were manually incremented past the + button guard but the search result was re-used).
- Files: `app/cashier/pos/page.tsx` (line 150-154)
- Trigger: Add item, manually type a high quantity (if input allowed), then checkout.
- Workaround: Backend transaction rejects with stock error.

## Security Considerations

**Access token in localStorage (XSS risk):**
- Risk: Script injection in any page can read `localStorage.accessToken` and exfiltrate the token.
- Files: `lib/auth/client.ts`, multiple admin pages
- Current mitigation: 15-minute expiry limits the window.
- Recommendations: Move to HttpOnly cookie as described in Tech Debt section above.

**`createdBy` on User is a string, not enforced FK:**
- Risk: `User.createdBy` is stored as a plain `String?` with no relational constraint to another `User`. An admin can be soft-deleted but their `createdBy` references remain with no cascade.
- Files: `prisma/schema.prisma` (line 37)
- Current mitigation: None.
- Recommendations: Either add a proper self-referencing FK with `SetNull` on delete, or treat it as an audit-only field and document that it is not a live reference.

**Audit log metadata is untyped `Json?`:**
- Risk: The `metadata` field in `AuditLog` accepts arbitrary JSON with no schema enforcement, making it easy to accidentally log sensitive data (e.g., partial passwords, PII).
- Files: `prisma/schema.prisma` (line 58), `lib/audit/logger.ts`
- Current mitigation: Callers pass controlled objects, but nothing prevents a future caller from logging unsafe data.
- Recommendations: Define a `AuditMetadata` TypeScript type and validate before logging.

**No middleware-level route guard for admin/finance pages:**
- Risk: Next.js middleware (`middleware/` directory) does not appear to protect `/admin/*` or `/finance/*` routes at the edge. Auth is only checked inside individual API routes. A user who navigates directly to `/admin/users` will see the page HTML before client-side auth redirects kick in.
- Files: Route guards are absent at the Next.js middleware layer; client pages rely on `localStorage.getItem('accessToken')` checks.
- Current mitigation: API calls return 401/403 so no data is exposed.
- Recommendations: Add a `middleware.ts` at the project root that checks the `access_token` cookie (once moved to HttpOnly) and redirects unauthenticated users server-side.

## Performance Bottlenecks

**Sales report loads full item details per page:**
- Problem: `GET /api/reports/sales` uses `include: { items: { ... } }` for every sale row in a 50-row page. This is an N+1 pattern at the item level — each sale loads all its items.
- Files: `app/api/reports/sales/route.ts` (lines 26-43)
- Cause: Margin calculation is done in JavaScript after fetching all items, rather than in SQL.
- Improvement path: Push margin calculation into a SQL expression using `prisma.$queryRaw` or a Prisma computed field. Only fetch aggregated revenue/cost per sale, not individual items.

**No pagination on inventory list:**
- Problem: `GET /api/admin/inventory` fetches all products with no limit or pagination.
- Files: `app/api/admin/inventory/route.ts`
- Cause: Simple `findMany` with no `take`/`skip`.
- Improvement path: Add cursor- or offset-based pagination with a default limit of 50.

**Audit log count query runs before every paginated fetch:**
- Problem: `GET /api/audit` runs `prisma.auditLog.count({ where })` followed immediately by `prisma.auditLog.findMany({ where, ... })`. Both hit the DB sequentially.
- Files: `app/api/audit/route.ts` (lines 75-93)
- Cause: Sequential await instead of parallel.
- Improvement path: Run both with `Promise.all([count, findMany])` to execute in parallel.

## Fragile Areas

**`FOR UPDATE` raw SQL in Prisma transaction:**
- Files: `app/api/cashier/sales/route.ts` (lines 52-65)
- Why fragile: Uses `$queryRaw` with template literals and PostgreSQL-specific syntax (`ANY(${productIds}::text[])`). This bypasses Prisma type safety and is tightly coupled to PostgreSQL. If product IDs contain unexpected characters, SQL injection risk exists (though template literal tagging in Prisma mitigates this).
- Safe modification: Always use the tagged template literal form (backtick `$queryRaw\`...\``), never string concatenation. Add an integration test for the stock-lock behavior.
- Test coverage: No test covers the concurrent checkout race condition.

**`store_qty - ${item.quantity}` raw UPDATE:**
- Files: `app/api/cashier/sales/route.ts` (lines 113-117)
- Why fragile: Raw SQL `$executeRaw` for inventory decrement. If the `FOR UPDATE` lock above is removed or the query is refactored, the decrement could race.
- Safe modification: Keep both raw SQL operations inside the same `$transaction` block. Never split them.

**Prisma client output path is non-standard:**
- Files: `lib/db.ts` (line 1: `import { PrismaClient } from '../.prisma/client/client'`), `prisma/schema.prisma` (line 7: `output = "../.prisma/client"`)
- Why fragile: Custom output path means the generated client is at `.prisma/` in the project root rather than `node_modules/@prisma/client`. Any tool or IDE that auto-imports from the default path will fail. Seed scripts and tests must also use this path.
- Safe modification: Document this path in onboarding. Do not move the output without updating all import sites.

## Test Coverage Gaps

**Checkout race condition is untested:**
- What's not tested: Two concurrent checkout requests for the same product with only 1 unit in stock.
- Files: `app/api/cashier/sales/route.ts`
- Risk: If the `FOR UPDATE` lock is ever removed or misapplied, overselling goes undetected.
- Priority: High

**Auth middleware is untested:**
- What's not tested: Token expiry handling, missing Authorization header, malformed JWT.
- Files: `middleware/auth.ts`, `middleware/rbac.ts`
- Risk: Regression in auth could silently pass unauthenticated requests.
- Priority: High

**Frontend pages have no component tests:**
- What's not tested: POS checkout flow, users create/edit dialogs, finance report filters.
- Files: `app/cashier/pos/page.tsx`, `app/admin/users/page.tsx`, `app/finance/reports/page.tsx`
- Risk: UI regressions (like the recent `role.name` rendering bug) are only caught manually.
- Priority: Medium

**No test for refresh token expiry and rotation:**
- What's not tested: Expired refresh token rejection, revoked token behavior.
- Files: `app/api/auth/refresh/route.ts`
- Risk: Security regression in token lifecycle.
- Priority: High

## Missing Critical Features

**No product update or delete endpoint:**
- Problem: `app/api/products/route.ts` only implements `POST` (create) and `GET` (list). There is no `PATCH` or `DELETE` for products. The admin products UI must handle this gap.
- Blocks: Correcting mispriced or discontinued products.

**No token blacklist on logout:**
- Problem: `app/api/auth/logout/route.ts` removes the refresh token from DB, but the access token (still valid for up to 15 minutes) is not invalidated. A logged-out user's stolen access token remains usable.
- Blocks: Compliance requirements for immediate session termination.

**No audit logging for sales, inventory, and incentives:**
- Problem: The `AuditLog` schema lists `SALE_CREATE`, `INVENTORY_REPLENISH`, and `INCENTIVE_CREATE` as expected actions, but these are commented in the audit page UI as "Phase 2 backfill." The current sales checkout and inventory replenish routes do not write to `audit_log`.
- Files: `app/admin/audit/page.tsx` (lines 51-53 comments), `app/api/cashier/sales/route.ts` (only calls `logAction` for sale metadata, not audit log table), `app/api/admin/inventory/replenish/route.ts`
- Blocks: Complete audit trail for compliance.

---

*Concerns audit: 2026-04-22*
