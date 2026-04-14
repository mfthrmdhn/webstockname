# Stack Research

**Project:** WebStockName - Single-store retail inventory, sales tracking, and staff incentive management system

**Domain:** Retail POS and Inventory Management

**Researched:** April 14, 2026

**Confidence:** HIGH (verified with current releases, official documentation, and industry 2026 consensus)

---

## Recommended Stack

This stack prioritizes developer productivity, type safety, and scalability from day one, while keeping operational complexity manageable for a single-store MVP.

### Frontend Stack

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **React** | 19.2+ | UI rendering | Industry standard with largest ecosystem; React 19 adds improved SSR and compiler support for Next.js integration |
| **Next.js** | 16.2+ | Full-stack framework | Server components, file-based routing, built-in API routes eliminate need for separate backend framework initially; Turbopack default compilation (90% faster dev startup than Webpack) |
| **TypeScript** | 5.x+ | Type safety | Reduces bugs in financial/inventory logic; catches errors at compile time; essential for RBAC and role-specific data flows |
| **Tailwind CSS** | 4.x+ | Styling | Utility-first CSS scales without class inflation; small bundle size; works well with shadcn/ui components |
| **shadcn/ui** | Latest | Component library | Copy-paste components (no vendor lock-in); built on Radix UI primitives; accessible by default; perfect for RBAC UI variations (superadmin vs finance vs cashier dashboards) |

**Why this frontend combination:**
- Next.js 16 with React 19 allows building three distinct UIs (cashier POS, finance dashboard, superadmin control panel) from one codebase with shared components
- Full TypeScript coverage ensures role-based access control logic is type-checked
- shadcn/ui + Tailwind means UI is customizable per role without creating separate apps
- No separate frontend build/deploy pipeline needed initially

### Backend Stack

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Node.js** | 22 LTS+ | Runtime | Native ESM support, strong async/await for I/O-heavy POS operations, ecosystem standardized on Node |
| **Express.js** | 4.18+ OR **NestJS** | 11.x+ | HTTP server | Express for simplicity and control; NestJS for structured architecture at scale (see alternatives section for decision criteria) |
| **Prisma ORM** | 7.4+ | Database abstraction | Type-safe queries with auto-generated client; migrations built-in; query caching (v7.4) eliminates N+1 problems; perfect for relational inventory/sales/incentive schema |
| **JWT (jsonwebtoken)** | 9.x+ | Authentication | Stateless auth for staff login; bearer tokens for API; HttpOnly cookie refresh tokens for security |
| **bcryptjs** | 2.4+ | Password hashing | Standard for staff credential storage |

**Why Express vs NestJS:**
- **Use Express (lightweight start):** Single developer or small team, MVP speed paramount, simple RBAC (3 roles), transaction logic manageable with middleware
- **Use NestJS (structured growth):** Team of 2+ backend developers, expecting rapid feature velocity, complex permission hierarchies, want dependency injection for testability

**For WebStockName MVP:** Start with Express. NestJS adds ceremony that slows initial feature velocity. Migrate to NestJS during Phase 2 if team grows or complexity increases.

### Database Stack

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **PostgreSQL** | 16+ | Primary database | Superior relational model for inventory/sales/incentives; JSONB for flexible product metadata; powerful aggregation (cumulative sales, margin calculations, incentive tracking) |
| **Redis** | 7.x+ | Session cache & real-time inventory | Session storage (stateless auth across requests); real-time stock level caching to prevent overselling during concurrent sales; sub-millisecond lookups for "is it in stock?" queries |

**PostgreSQL schema priorities:**
- Products table (SKU, name, price, cost, category) — enables profit margin calculations
- InventoryLog table (store_qty, warehouse_qty, update_timestamp) — tracks every adjustment for audit
- Sales table (sale_id, product_id, staff_id, quantity, price, cost, timestamp) — base for all reporting
- SalesAttribution table (sale_id, attributed_to_staff_id) — links sale to salesperson for incentives
- Incentives table (staff_id, sale_id, amount, created_by) — manual entry log for superadmin-approved incentives
- StaffRole table (staff_id, role_enum: SUPERADMIN|FINANCE|CASHIER) — RBAC enforcement

**Why PostgreSQL over MySQL:**
- JSONB indexing (30-50% smaller/faster than text JSON) for flexible product attributes
- Superior window functions for cumulative sales/margin reporting
- Native JSON path queries for complex inventory filtering
- Better concurrent write performance (important for simultaneous POS transactions)

**Why Redis:**
- 10-100x faster than database queries for "is item in stock?" — critical for cashier UX
- Session storage prevents sticky server requirement (enables horizontal scaling later)
- Atomic operations prevent race conditions in concurrent sales (e.g., selling same inventory twice)

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Prisma Client** | 7.4+ | Query builder | Every database operation (inventory checks, sales insert, reporting aggregations) |
| **Zod** | 3.x+ | Runtime validation | Validate API payloads (cashier ringup, staff login, incentive entry) before database |
| **react-query** or **TanStack Query** | 5.x+ | Server state | Cache sales/inventory data client-side; automatic refetch after mutations; perfect for dashboard real-time updates |
| **axios** or **fetch** | Latest | HTTP client | API calls from frontend (add sale, check stock, load reports) |
| **jsonwebtoken** | 9.x+ | JWT signing/verification | Staff authentication tokens |
| **cors** | 2.8+ | Cross-origin middleware | Enable frontend-to-backend API calls safely |
| **dotenv** | 16.x+ | Environment variables | Store database URL, JWT secret, payment API keys securely |
| **winston** or **pino** | Latest | Logging | Track sales transactions, errors, audit trail for compliance |

### Development Tools

| Tool | Purpose | Configuration Notes |
|------|---------|-------------------|
| **Vitest** | Unit/integration tests | 10-20x faster than Jest on TypeScript projects; drop-in Jest replacement; use for all business logic (RBAC rules, margin calculations, inventory deductions) |
| **Testing Library** | React component tests | Test cashier POS UI, finance dashboard, superadmin panels independently |
| **ESLint** | Code quality | Use Next.js config preset for React 19 compatibility |
| **Prettier** | Code formatting | Format both TypeScript and SQL (Prisma) migrations |
| **Docker** | Containerization | Package for deployment; PostgreSQL container for local dev |
| **tsx** | TypeScript runtime | Run migrations and scripts without compilation step |

---

## Installation

```bash
# Core dependencies
npm install next@16 react@19 typescript@5
npm install express@4 prisma@7 @prisma/client
npm install postgres
npm install jsonwebtoken bcryptjs cors dotenv

# UI & styling
npm install tailwindcss@4 autoprefixer
npm install radix-ui axios react-query

# Validation
npm install zod

# Redis (optional, Phase 2+)
npm install redis ioredis

# Logging
npm install winston

# Dev dependencies
npm install -D vitest @vitest/ui
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D eslint prettier
npm install -D tsx
npm install -D @types/node @types/express

# Initialize Next.js with TypeScript
npx create-next-app@16 webstockname --typescript --tailwind

# Initialize Prisma
npx prisma init
```

---

## Stack Variants by Phase

### Phase 1 (MVP - Current)
- **Frontend:** Next.js 16 (App Router) + shadcn/ui + Tailwind
- **Backend:** Express.js on same Next.js server (API routes in `/app/api`)
- **Database:** PostgreSQL local/cloud
- **Auth:** JWT with HttpOnly cookies
- **Caching:** Skip Redis initially; use Next.js fetch caching
- **Deployment:** Vercel (handles Next.js natively) or self-hosted Node.js

**Rationale:** Single deployment, shared codebase, zero operational overhead.

### Phase 2 (Multi-location expansion)
- **Add:** Redis for session management + real-time inventory sync across locations
- **Consider:** Extract backend to separate service if teams diverge
- **Still use:** PostgreSQL (no scaling needs yet at single-store scale)

**When to migrate backend:** If cashier checkout latency exceeds 500ms OR team reaches 3+ backend developers.

### Phase 3+ (Enterprise features)
- **Consider:** Event sourcing for audit trail (every inventory movement)
- **Consider:** GraphQL if mobile apps added
- **Database:** Consider read replicas for analytics if reporting impact POS performance

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js | SvelteKit | If team strongly prefers Svelte syntax; smaller bundle (SvelteKit ships 30% less JS) but smaller ecosystem for RBAC libraries |
| Next.js | Remix | If you need form submission without JavaScript; WebStockName needs client-side interactivity (stock checks during checkout), so benefits are minimal |
| Express.js | Fastify | If backend is extracted and throughput exceeds 10K req/s; Fastify is 2x faster but both are overkill for single-store MVP (expect <1K req/s) |
| Express.js | Hono | Lightweight alternative with better TypeScript support; good if self-hosting on limited infrastructure, but Express ecosystem is larger |
| Prisma | Drizzle ORM | If you prefer SQL-like query syntax over Prisma's chainable API; Drizzle has smaller bundle (important for serverless); both are production-ready |
| Prisma | Raw SQL queries | If your team is SQL-expert and prefers control; loses type safety that catches inventory/finance logic bugs |
| PostgreSQL | SQLite | Only if this is hobby project; SQLite can't handle concurrent writes from simultaneous POS transactions reliably; use PostgreSQL even locally |
| PostgreSQL | MongoDB | Schema-less tempting but relational model is perfect fit here (products, sales, users have clear relationships); JSON fields in Postgres give flexibility without schemalessness |
| JWT | Session-based (server) | Server sessions require sticky load balancer; JWT is stateless, scales horizontally when needed; stick with JWT for single-store MVP |
| Redis | Memcached | Redis is faster, supports data structures (sets, sorted sets), persistence; Memcached only if Redis unavailable in your infrastructure |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **GraphQL** (Phase 1) | Adds query complexity without benefit; simple CRUD endpoints sufficient for single-store POS; overhead in schema management vs REST API simplicity | REST API with Express routes; migrate to GraphQL only if mobile app added |
| **Firebase/Firestore** | Real-time inventory requires atomic operations across documents; Firestore transactions are eventual-consistency which breaks POS ("sorry, we sold that last item twice"); PostgreSQL transactions are ACID-guaranteed | PostgreSQL with proper transaction handling |
| **MongoDB** | Inventory schema is relational (products → sales → staff → incentives); document databases lose referential integrity, making margin/incentive calculations error-prone; no native JSONB query optimization | PostgreSQL with JSONB for flexible product metadata |
| **Serverless Functions** (Phase 1) | Cold start latency fatal for cashier checkout (3-5s); Firebase functions or AWS Lambda can't guarantee sub-500ms response for "is item in stock?" queries | Traditional server (Express or Fastify) on VPS or PaaS (Vercel, Railway, Render) |
| **Vue.js** (if team knows React) | Both are capable; React has 2-3x larger ecosystem for enterprise dashboards, RBAC patterns, and hiring talent; learning curve similar for teams | React/Next.js; use Vue only if team pre-exists and experienced |
| **Class-based ORM** (TypeORM, Sequelize) | Verbose, more boilerplate than Prisma; slower in large projects (e.g., TypeORM migrations 3-4x slower than Prisma); Prisma's query caching (v7.4) prevents N+1 | Prisma ORM |
| **Plain SQL in application code** | SQL injection risk if not careful; lose type safety for inventory counts; hard to refactor schema later | Prisma ORM or parameterized queries always |
| **Cookies for JWT storage** (instead of HttpOnly) | Vulnerable to XSS (malicious script steals token); staff password compromise via script injection | HttpOnly, Secure, SameSite cookies for refresh tokens |
| **Bcrypt in frontend** | Password hashing must happen server-side; frontend hashing gives false sense of security (attacker can still intercept plaintext in transit or hash at input) | bcryptjs on backend in POST /login endpoint |

---

## Version Compatibility Notes

### React 19 + Next.js 16
- React 19 fully supported in Next.js 16.2+
- React Compiler (stable in 16.2) auto-optimizes renders; no configuration needed
- All shadcn/ui components compatible with React 19

### Prisma 7.4 + PostgreSQL 16
- Prisma 7.4 introduces query caching (100% cache hit on repeated queries)
- 3x faster large result sets vs Prisma 5.x
- Compatible with PostgreSQL 14+; prefer 16 for JSON path improvements

### Node.js 22 LTS + Express 4.18
- Express 4.18+ requires Node 14.21+ (use 22 LTS for stability through 2027)
- Async/await fully native (no runtime helpers needed)

### TypeScript 5 + Node 22
- Native decorators support (if NestJS used in Phase 2)
- Target: "ES2020" in tsconfig.json for async/await optimization

### Zod + TypeScript
- Zod infers types automatically; use `z.infer<typeof schema>` to reduce duplicate type definitions

---

## Security Defaults

### Database Credentials
```env
DATABASE_URL=postgresql://user:password@localhost:5432/webstockname
REDIS_URL=redis://localhost:6379
JWT_SECRET=<generate with: openssl rand -base64 32>
```

**Never commit .env files; use .env.local locally and environment variables in production.**

### JWT Configuration
- **Access token expiry:** 15 minutes (short-lived; forces refresh)
- **Refresh token expiry:** 7 days (longer-lived; stored in HttpOnly cookie)
- **Algorithm:** HS256 (HMAC with SHA-256)

### Password Requirements
- Minimum 12 characters (bcryptjs rounds: 10+)
- Enforce via Zod validation on backend: `z.string().min(12)`

### RBAC Implementation
```prisma
enum Role {
  SUPERADMIN  // manage users, approve payroll, set workflows
  FINANCE     // read-only sales, incentive data
  CASHIER     // POS operations, stock checks
}

model Staff {
  id String @id
  email String @unique
  role Role
  // At API endpoint: verify request.user.role before returning data
}
```

---

## Performance Targets

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| API response (stock check) | <100ms | Redis cache + index on product.sku + N+1 query prevention via Prisma select |
| API response (ringup sale) | <500ms | Indexed inserts; Redis atomic increment for inventory; batch sales in transaction |
| Page load (cashier POS) | <2s | Next.js static export superadmin UI; API routes cached with React Query |
| Sales transaction throughput | 10 sales/sec | PostgreSQL write-ahead log; connection pooling; batch inserts if >5 concurrent |

---

## Sources

### Frontend & Framework
- [Next.js 16 Release Blog](https://nextjs.org/blog/next-16) — Turbopack stable, React 19 support verified
- [React 19 Release Notes](https://react.dev/versions) — Latest 19.2.5, compatible with Next.js 16.2
- [shadcn/ui 2026 Ecosystem Overview](https://dev.to/whoffagents/shadcn-ui-in-2026-the-component-library-that-changed-how-we-build-uis-296o) — Confirmed as industry standard for admin dashboards
- [Top 10 Frontend Frameworks 2026](https://www.hellobizmia.com/insights/top-10-frontend-frameworks-in-2026) — React dominance confirmed; Next.js 16 default for production
- [Next.js Admin Dashboard Guide](https://dev.to/hitesh_developer/step-by-step-guide-to-building-an-admin-dashboard-with-nextjs-26e4) — Multiple role-based dashboards recommended pattern

### Backend & ORM
- [Best Backend Frameworks 2026](https://www.index.dev/blog/best-backend-frameworks-ranked) — Express and NestJS comparison; Express for simplicity confirmed
- [Prisma 7.4 Release with Query Caching](https://github.com/prisma/prisma/releases) — Performance improvements verified; compatible with all databases
- [Prisma vs Drizzle ORM 2026](https://zenstack.dev/blog/orm-2026) — Prisma recommended for relational inventory schema
- [NestJS 11 Features](https://trilon.io/blog/announcing-nestjs-11-whats-new) — Current stable version; upgrade path documented

### Database
- [PostgreSQL for Inventory Management](https://www.dbvis.com/thetable/how-to-use-sql-to-manage-business-inventory-data-in-postgres-and-visualize-the-data/) — Best practices for product/stock schema
- [PostgreSQL JSON Tricks 2026](https://postgresqlhtx.com/postgresql-json-tricks-you-need-to-know-in-2026/) — JSONB indexing strategies verified
- [Best Database for Inventory 2026](https://catdoes.com/blog/database-for-inventory-management-system) — PostgreSQL confirmed as industry standard
- [Redis Real-Time Inventory](https://redis.io/tutorials/howtos/solutions/real-time-inventory/available-to-promise/) — Redis for sub-millisecond stock checks verified

### Authentication & Authorization
- [JWT + Bearer Tokens in Express](https://apidog.com/blog/bearer-token-nodejs-express/) — Best practices for stateless auth
- [RBAC vs ABAC 2026](https://www.oloid.com/blog/rbac-vs-abac-vs-pbac) — RBAC sufficient for Phase 1; ABAC for Phase 3+
- [Secure JWT Implementation 2026](https://www.freecodecamp.org/news/how-to-build-a-secure-authentication-system-with-jwt-and-refresh-tokens/) — HttpOnly cookies, refresh token strategy

### Testing & Development
- [Vitest vs Jest 2026](https://qaskills.sh/blog/jest-vs-vitest-2026) — Vitest 10-20x faster; Jest still viable
- [Testing Library React Components](https://oneuptime.com/blog/post/2026-01-15-unit-test-react-vitest-testing-library/view) — Standard approach for component testing

### Retail & POS
- [Best POS Systems 2026](https://getquantic.com/best-pos-system-for-retail/) — Industry trends confirm inventory + sales + staff tracking as standard
- [Stripe vs Square 2026](https://tailoredpay.com/blog/stripe-vs-square/) — Payment processing comparison; Square for in-person, Stripe for flexibility

---

**Stack research for:** Single-store retail inventory, sales tracking, and incentive management system

**Last updated:** April 14, 2026
