# Architecture

**Analysis Date:** 2026-04-22

## Pattern Overview

**Overall:** Next.js Full-Stack Monolith (App Router)

**Key Characteristics:**
- Single Next.js application serves both frontend UI and backend REST API via App Router route handlers
- Role-based UI partitioning: three distinct portal surfaces (admin, cashier, finance) under one codebase
- Stateless JWT authentication with dual-token strategy (short-lived access + long-lived refresh stored in HttpOnly cookie)
- Database interactions exclusively through Prisma ORM singleton — no raw SQL except for `FOR UPDATE` row-locking in sale transactions
- All state-changing operations write to an append-only `audit_log` table via `lib/audit/logger.ts`

## Layers

**Routing / UI Layer:**
- Purpose: Serves role-partitioned pages and handles navigation
- Location: `app/`
- Contains: Page components (`page.tsx`), layout wrappers (`layout.tsx`), global styles (`globals.css`)
- Depends on: Components layer, Client auth utilities
- Used by: End users (browser)

**API Layer:**
- Purpose: Handles HTTP requests, enforces auth/RBAC, validates input, orchestrates business logic
- Location: `app/api/`
- Contains: Next.js Route Handlers (`route.ts` files) organized by domain
- Depends on: Middleware layer, Lib layer, Prisma
- Used by: Frontend pages (fetch calls), external clients

**Middleware Layer:**
- Purpose: Authentication and authorization guard functions composed into API routes
- Location: `middleware/auth.ts`, `middleware/rbac.ts`
- Contains: `authMiddleware` (JWT Bearer verification), `rbacMiddleware` (role enforcement factory)
- Depends on: `lib/auth/jwt.ts`
- Used by: All protected API route handlers

**Route Guard (Next.js Edge Middleware):**
- Purpose: Page-level RBAC redirect — blocks unauthorized browser navigation before rendering
- Location: `middleware.ts` (root)
- Contains: Edge middleware using `jose` for JWT verification; redirects `/admin`, `/cashier`, `/finance` paths
- Depends on: `access_token` cookie
- Used by: Next.js request pipeline automatically

**Lib / Core Layer:**
- Purpose: Shared utilities, infrastructure clients, and domain helpers
- Location: `lib/`
- Contains:
  - `lib/db.ts` — Prisma singleton (dev hot-reload safe)
  - `lib/auth/jwt.ts` — token generation and verification
  - `lib/auth/password.ts` — bcrypt helpers
  - `lib/auth/client.ts` — browser-side auth helpers (login, logout, token refresh)
  - `lib/auth/decode.ts` — client-side JWT decode (no verification)
  - `lib/audit/logger.ts` — `logAction()` for immutable audit trail
  - `lib/utils.ts` — general utilities
- Depends on: Prisma, `jsonwebtoken`, `bcryptjs`
- Used by: API routes, middleware

**Database Layer:**
- Purpose: Data persistence
- Location: `prisma/schema.prisma`, migrations in `prisma/migrations/`
- Contains: PostgreSQL via Prisma — models: `Role`, `User`, `RefreshToken`, `AuditLog`, `Product`, `Sale`, `SaleItem`, `Incentive`
- Depends on: PostgreSQL (configured via `DATABASE_URL`)
- Used by: `lib/db.ts` Prisma singleton

**Components Layer:**
- Purpose: Shared and role-specific UI components
- Location: `components/`
- Contains:
  - `components/ui/` — shadcn/ui primitives (button, dialog, input, select, table, tabs, alert, label, textarea)
  - `components/AdminNav.tsx` — superadmin sidebar navigation
  - `components/FinanceNav.tsx` — finance portal navigation
  - `components/AuthProvider.tsx` — client-side auth context
  - `components/LogoutButton.tsx` — shared logout action
  - `components/toast.tsx` — toast notification provider
- Depends on: shadcn/ui, Radix UI
- Used by: App page and layout components

## Data Flow

**Cashier Checkout (Sale Creation):**

1. Cashier fills cart in `app/cashier/pos/page.tsx` and submits
2. Browser POSTs to `/api/cashier/sales` with `Authorization: Bearer <accessToken>` header
3. `authMiddleware` extracts and verifies the Bearer token; attaches `user` to request
4. `rbacMiddleware(['CASHIER', 'SUPERADMIN'])` checks role; returns 403 if unauthorized
5. Zod schema validates request body (items, salespersonId, paymentMethod)
6. Prisma `$transaction` begins:
   - Raw `SELECT ... FOR UPDATE` locks product rows to prevent oversell
   - Stock levels validated per item
   - Price taken from DB (never from request body)
   - `Sale` record created; `SaleItem` records bulk-inserted with price snapshot
   - `store_qty` decremented atomically via raw `UPDATE`
7. `logAction()` writes `SALE_CREATE` entry to `audit_log`
8. Response returned with `saleId`, `total`, `changeDue`

**Authentication Flow:**

1. User POSTs credentials to `/api/auth/login`
2. User fetched from DB with `role` included
3. `comparePassword` (bcrypt) validates credentials
4. `generateAccessToken` (15m) and `generateRefreshToken` (7d) created
5. Refresh token SHA-256 hashed and stored in `refresh_tokens` table
6. Response: `accessToken` in JSON body + `access_token` cookie (non-HttpOnly for middleware reads) + `refresh_token` HttpOnly cookie
7. Client stores `accessToken` in `localStorage` via `lib/auth/client.ts`
8. Root `middleware.ts` reads `access_token` cookie to guard page routes

**Token Refresh:**

1. Client calls `/api/auth/refresh` with `refresh_token` cookie
2. Raw token hashed and matched against `refresh_tokens` table
3. New `accessToken` returned; client updates `localStorage`

**State Management:**
- Server state: fetched directly via `fetch()` in client page components using `localStorage` Bearer token
- No global state management library; `AuthProvider` component provides user context client-side
- No React Query in current implementation — pages use `useEffect` + `fetch`

## Key Abstractions

**authMiddleware:**
- Purpose: Verifies Bearer JWT and attaches `user: TokenPayload` to the request object
- Examples: Used in every protected API route (`app/api/cashier/sales/route.ts`, `app/api/users/route.ts`, etc.)
- Pattern: Returns `NextResponse` on failure, `null` on success (caller checks for null to continue)

**rbacMiddleware (factory):**
- Purpose: Role enforcement — accepts `allowedRoles[]`, returns a middleware function
- Examples: `rbacMiddleware(['CASHIER', 'SUPERADMIN'])(request)`, `rbacMiddleware(['SUPERADMIN'])(request)`
- Pattern: Same null-or-response pattern as `authMiddleware`; composed after auth check

**logAction:**
- Purpose: Append-only audit trail for all state-mutating operations
- Examples: `lib/audit/logger.ts`
- Pattern: Called after successful mutations (not inside transaction) with `userId`, action type, entity type, optional entityId and metadata JSON

**Prisma Singleton:**
- Purpose: Single shared database client across hot-reload cycles in dev
- Examples: `lib/db.ts`
- Pattern: Dynamic import (`await import('@/lib/db')`) in API routes to avoid edge runtime issues

## Entry Points

**Root Page:**
- Location: `app/page.tsx`
- Triggers: Browser navigation to `/`
- Responsibilities: Static placeholder; no routing logic

**Login Page:**
- Location: `app/login/page.tsx`
- Triggers: Unauthenticated access or redirect from middleware
- Responsibilities: Renders login form; calls `lib/auth/client.ts` login; redirects on success

**Admin Portal:**
- Location: `app/admin/layout.tsx`, `app/admin/page.tsx`
- Triggers: Authenticated SUPERADMIN navigating to `/admin`
- Responsibilities: Dashboard, user management (`/admin/users`), product management (`/admin/products`), inventory (`/admin/inventory`), audit log (`/admin/audit`)

**Cashier POS:**
- Location: `app/cashier/pos/page.tsx`
- Triggers: Authenticated CASHIER or SUPERADMIN navigating to `/cashier/pos`
- Responsibilities: Product search, cart management, salesperson selection, checkout

**Finance Reports:**
- Location: `app/finance/reports/page.tsx`
- Triggers: Authenticated FINANCE or SUPERADMIN navigating to `/finance/reports`
- Responsibilities: Sales reports, staff performance, reconciliation views

**Next.js Edge Middleware:**
- Location: `middleware.ts`
- Triggers: Every request matching `/admin/:path*`, `/cashier/:path*`, `/finance/:path*`
- Responsibilities: JWT role verification; redirects to `/login` if unauthorized

## Error Handling

**Strategy:** Per-route try/catch with structured JSON error responses

**Patterns:**
- API routes return `{ error: string }` with appropriate HTTP status codes (400, 401, 403, 404, 500)
- Zod validation errors returned as `{ error: 'Invalid input', details: ZodError[] }` with status 400
- Business logic errors (e.g., insufficient stock) thrown as `Error` inside Prisma transactions; caught in route handler and returned as 400
- Prisma transaction errors bubble up as 500 unless identified as known business errors
- `authMiddleware` and `rbacMiddleware` return `NextResponse` directly (401/403); callers check and return early

## Cross-Cutting Concerns

**Logging:** `lib/audit/logger.ts` — `logAction()` writes to `audit_log` table for compliance. Console.error used for unexpected server errors only.

**Validation:** Zod schemas defined inline within each API route handler. No shared schema registry.

**Authentication:** Dual-layer — Next.js Edge Middleware (`middleware.ts`) guards pages; `authMiddleware` in `middleware/auth.ts` guards API routes. Access token stored in both cookie (for middleware) and `localStorage` (for API Bearer headers).

---

*Architecture analysis: 2026-04-22*
