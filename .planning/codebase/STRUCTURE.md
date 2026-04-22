# Codebase Structure

**Analysis Date:** 2026-04-22

## Directory Layout

```
webstockname/
├── app/                        # Next.js App Router (pages + API routes)
│   ├── admin/                  # Superadmin portal pages
│   │   ├── audit/page.tsx      # Audit log viewer
│   │   ├── inventory/page.tsx  # Inventory management
│   │   ├── products/page.tsx   # Product catalog management
│   │   ├── users/page.tsx      # User management
│   │   ├── layout.tsx          # Admin shell layout (AdminNav + ToastProvider)
│   │   └── page.tsx            # Admin dashboard
│   ├── api/                    # Next.js Route Handlers (REST API)
│   │   ├── admin/
│   │   │   └── inventory/
│   │   │       ├── route.ts             # GET inventory list
│   │   │       └── replenish/route.ts   # POST warehouse replenishment
│   │   ├── audit/route.ts               # GET audit log
│   │   ├── auth/
│   │   │   ├── login/route.ts           # POST login
│   │   │   ├── logout/route.ts          # POST logout
│   │   │   └── refresh/route.ts         # POST token refresh
│   │   ├── cashier/
│   │   │   ├── products/route.ts        # GET products for POS
│   │   │   ├── sales/route.ts           # POST checkout
│   │   │   └── staff/route.ts           # GET cashier staff list
│   │   ├── incentives/
│   │   │   ├── route.ts                 # GET/POST incentives
│   │   │   └── cashiers/route.ts        # GET cashier list for incentive entry
│   │   ├── products/route.ts            # GET/POST products (admin)
│   │   ├── reports/
│   │   │   ├── reconciliation/route.ts  # GET reconciliation report
│   │   │   ├── sales/route.ts           # GET sales report
│   │   │   └── staff/route.ts           # GET staff performance report
│   │   └── users/
│   │       ├── route.ts                 # GET/POST users
│   │       └── [id]/
│   │           ├── route.ts             # GET/PATCH/DELETE user
│   │           ├── deactivate/route.ts  # POST deactivate user
│   │           └── reset-password/route.ts # POST reset password
│   ├── cashier/                # Cashier portal pages
│   │   ├── pos/page.tsx        # Point of sale interface
│   │   └── layout.tsx          # Cashier shell layout
│   ├── finance/                # Finance portal pages
│   │   ├── reports/page.tsx    # Finance reports
│   │   └── layout.tsx          # Finance shell layout (FinanceNav)
│   ├── dashboard/page.tsx      # Role-redirect landing after login
│   ├── login/page.tsx          # Login page
│   ├── globals.css             # Global Tailwind styles
│   ├── layout.tsx              # Root layout (html/body)
│   └── page.tsx                # Root page (static placeholder)
├── components/                 # Shared UI components
│   ├── ui/                     # shadcn/ui primitives
│   │   ├── alert.tsx
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   └── textarea.tsx
│   ├── AdminNav.tsx            # Superadmin sidebar navigation
│   ├── AuthProvider.tsx        # Client-side auth context provider
│   ├── FinanceNav.tsx          # Finance portal navigation
│   ├── LogoutButton.tsx        # Shared logout button component
│   └── toast.tsx               # Toast notification provider + hook
├── lib/                        # Core utilities and infrastructure
│   ├── auth/
│   │   ├── client.ts           # Browser auth helpers (login/logout/refresh)
│   │   ├── decode.ts           # Client-side JWT decode (no signature check)
│   │   ├── jwt.ts              # JWT generate/verify (server-side)
│   │   └── password.ts         # bcrypt hash/compare helpers
│   ├── audit/
│   │   └── logger.ts           # logAction() — audit trail writer
│   ├── db.ts                   # Prisma singleton client
│   └── utils.ts                # General utility functions
├── middleware/                 # API-level middleware functions
│   ├── auth.ts                 # authMiddleware — Bearer JWT verification
│   └── rbac.ts                 # rbacMiddleware — role enforcement factory
├── prisma/                     # Database schema and migrations
│   ├── schema.prisma           # Prisma schema (PostgreSQL)
│   ├── seed.ts                 # Seed script (TypeScript source)
│   ├── seed.cjs                # Seed script (compiled CJS for execution)
│   └── migrations/             # Prisma migration history
├── __tests__/                  # Primary test suite
│   ├── api/                    # API route tests
│   ├── endpoints/              # Endpoint integration tests by feature
│   ├── integration/            # Cross-feature integration tests
│   ├── unit/                   # Unit tests for business logic
│   ├── auth.test.ts            # Auth utility tests
│   ├── middleware.test.ts      # Middleware unit tests
│   ├── setup.ts                # Vitest global setup
│   └── test-utils.ts           # Shared test helpers and factories
├── tests/                      # Secondary/supplemental test suite
│   ├── api/                    # Additional API-level tests
│   └── lib/                    # Library unit tests
├── scripts/                    # Utility scripts
├── docs/                       # Internal documentation
├── middleware.ts               # Next.js Edge Middleware (page-level RBAC)
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── postcss.config.mjs          # PostCSS configuration
├── tsconfig.json               # TypeScript configuration
├── prisma.config.ts            # Prisma configuration overrides
├── vitest.config.ts            # Vitest test runner configuration
├── docker-compose.yml          # Local PostgreSQL container
└── package.json                # Dependencies and scripts
```

## Directory Purposes

**`app/admin/`:**
- Purpose: Superadmin-only UI pages
- Contains: User management, product catalog, inventory, audit log viewer
- Key files: `app/admin/users/page.tsx`, `app/admin/products/page.tsx`, `app/admin/inventory/page.tsx`, `app/admin/audit/page.tsx`

**`app/api/`:**
- Purpose: All REST API endpoints as Next.js Route Handlers
- Contains: Domain-organized `route.ts` files; each file exports HTTP method handlers (GET, POST, PATCH, DELETE)
- Key files: `app/api/auth/login/route.ts`, `app/api/cashier/sales/route.ts`, `app/api/users/route.ts`

**`app/cashier/`:**
- Purpose: Cashier POS interface
- Contains: POS page with product search, cart, checkout
- Key files: `app/cashier/pos/page.tsx`

**`app/finance/`:**
- Purpose: Finance team reports and reconciliation
- Contains: Sales reports, staff performance, reconciliation
- Key files: `app/finance/reports/page.tsx`

**`components/ui/`:**
- Purpose: shadcn/ui component primitives — do not modify directly
- Contains: Radix UI-based accessible components
- Add new shadcn components here via `npx shadcn add <component>`

**`lib/`:**
- Purpose: Shared server-side and isomorphic utilities
- Contains: Auth logic, DB client, audit logger, general utils
- Key files: `lib/db.ts`, `lib/auth/jwt.ts`, `lib/audit/logger.ts`

**`middleware/`:**
- Purpose: Composable API middleware functions (NOT the Next.js edge middleware)
- Contains: `authMiddleware` and `rbacMiddleware` — imported and called inside route handlers
- Key files: `middleware/auth.ts`, `middleware/rbac.ts`

**`prisma/`:**
- Purpose: Database schema source of truth and migration history
- Contains: `schema.prisma` (model definitions), migration SQL files, seed scripts
- Generated client output: `.prisma/client/` (root level, gitignored)

**`__tests__/`:**
- Purpose: Primary test suite organized by test type
- Contains: Unit, endpoint, and integration tests
- Key files: `__tests__/setup.ts`, `__tests__/test-utils.ts`

## Key File Locations

**Entry Points:**
- `middleware.ts`: Next.js Edge Middleware — page-level RBAC guard
- `app/layout.tsx`: Root HTML shell
- `app/login/page.tsx`: Authentication entry for all users
- `app/dashboard/page.tsx`: Post-login role-based redirect hub

**Configuration:**
- `next.config.ts`: Next.js framework config
- `tsconfig.json`: TypeScript config with `@/` path alias mapped to project root
- `vitest.config.ts`: Test runner config
- `prisma/schema.prisma`: Database schema (source of truth for all models)
- `docker-compose.yml`: Local PostgreSQL service definition

**Core Logic:**
- `lib/db.ts`: Prisma client singleton — import this for all DB access
- `lib/auth/jwt.ts`: Token generation and verification
- `lib/audit/logger.ts`: `logAction()` — call after every state mutation
- `middleware/auth.ts`: `authMiddleware` — compose first in protected routes
- `middleware/rbac.ts`: `rbacMiddleware` — compose after auth in protected routes

**Testing:**
- `__tests__/setup.ts`: Global test setup
- `__tests__/test-utils.ts`: Shared factories and helpers

## Naming Conventions

**Files:**
- API route handlers: always named `route.ts` (Next.js convention)
- Page components: always named `page.tsx` (Next.js convention)
- Layout components: always named `layout.tsx` (Next.js convention)
- Utility modules: descriptive kebab-case noun (`jwt.ts`, `password.ts`, `logger.ts`)
- React components: PascalCase (`AdminNav.tsx`, `LogoutButton.tsx`, `AuthProvider.tsx`)
- Test files: `*.test.ts` suffix

**Directories:**
- API route segments: lowercase kebab-case matching URL path (`reset-password/`, `cashier/`)
- Dynamic segments: bracket notation (`[id]/`)
- Feature grouping: domain-noun (`auth/`, `audit/`, `cashier/`, `reports/`)

**Exports:**
- Route handlers: named exports matching HTTP methods (`export async function GET`, `POST`, `PATCH`, `DELETE`)
- Utilities: named exports (no default except `lib/db.ts` which exports the Prisma singleton as default)
- React components: default export for page/layout components; named exports for shared components

## Where to Add New Code

**New API Endpoint:**
- Create directory under `app/api/<domain>/` and add `route.ts`
- Import `authMiddleware` and `rbacMiddleware` from `@/middleware/auth` and `@/middleware/rbac`
- Call `logAction()` from `@/lib/audit/logger` after any state mutation
- Define Zod validation schema inline in the route file

**New Admin Page:**
- Add `page.tsx` under `app/admin/<feature>/`
- Admin layout is inherited automatically from `app/admin/layout.tsx`

**New Finance Page:**
- Add `page.tsx` under `app/finance/<feature>/`
- Finance layout inherited from `app/finance/layout.tsx`

**New Cashier Page:**
- Add `page.tsx` under `app/cashier/<feature>/`
- Cashier layout inherited from `app/cashier/layout.tsx`

**New Shared Component:**
- Feature component: `components/<ComponentName>.tsx`
- UI primitive: `components/ui/<component>.tsx` (shadcn pattern)

**Shared Utility:**
- Auth-related: `lib/auth/<name>.ts`
- General: `lib/utils.ts` (extend) or `lib/<name>.ts` (new module)

**New Database Model:**
- Add to `prisma/schema.prisma`
- Run `npx prisma migrate dev --name <migration-name>`
- Update seed script `prisma/seed.ts` if needed

**New Tests:**
- Unit tests: `__tests__/unit/<feature>.test.ts`
- Endpoint tests: `__tests__/endpoints/<feature>.test.ts`
- Integration tests: `__tests__/integration/<scenario>.test.ts`

## Special Directories

**`.prisma/client/`:**
- Purpose: Generated Prisma client code
- Generated: Yes (by `prisma generate`)
- Committed: No (gitignored)

**`coverage/`:**
- Purpose: Vitest code coverage output
- Generated: Yes
- Committed: No

**`.planning/`:**
- Purpose: GSD workflow planning artifacts (phases, codebase maps, debug notes)
- Generated: Partially (by GSD commands)
- Committed: Yes

**`.claude/`:**
- Purpose: Claude agent configuration, commands, and worktrees
- Generated: Partially
- Committed: Yes

---

*Structure analysis: 2026-04-22*
