# External Integrations

**Analysis Date:** 2026-04-22

## APIs & External Services

No third-party external APIs (payment processors, email providers, analytics) detected in the current codebase. All functionality is self-contained.

## Data Storage

**Databases:**
- PostgreSQL 16
  - Connection: `DATABASE_URL` env var (loaded by Prisma via `datasource db` in `prisma/schema.prisma`)
  - Client: Prisma ORM 6.19.3 with custom output path `.prisma/client`
  - Also available: `pg` 8.20+ direct client for raw queries
  - Dev container: `webstockname_db` (Docker, `docker-compose.yml`, port 5432)
  - Schema models: `Role`, `User`, `AuditLog`, `RefreshToken`, `Product`, `Sale`, `Incentive`

**File Storage:**
- Local filesystem only — no cloud file storage integration detected

**Caching:**
- None — Redis not implemented; Next.js fetch caching used where applicable

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based implementation (no third-party auth provider)
  - Access tokens: short-lived JWT signed with `JWT_SECRET` env var via `jsonwebtoken` library (`app/api/auth/`)
  - Refresh tokens: hashed and stored in `refresh_tokens` table; managed via Prisma
  - Token verification in Edge runtime: `jose` library in `middleware.ts`
  - Token storage: HttpOnly cookies (`access_token`, `refresh_token`)
  - Password hashing: `bcryptjs` on backend

**RBAC:**
- Three roles enforced: `SUPERADMIN`, `FINANCE`, `CASHIER`
- Route protection in `middleware.ts` (Next.js Edge middleware)
- Role-level guards in `middleware/auth.ts` and `middleware/rbac.ts`

## Monitoring & Observability

**Error Tracking:**
- None detected — no Sentry, Datadog, or similar integration

**Logs:**
- `console.*` only — no structured logging library (winston/pino not installed)
- Audit trail stored in database via `audit_log` table (append-only, indexed on `userId` and `createdAt`)

## CI/CD & Deployment

**Hosting:**
- Not configured — no Vercel config, Railway config, or Dockerfile detected beyond `docker-compose.yml` for local dev PostgreSQL

**CI Pipeline:**
- None detected — no GitHub Actions workflows or CI config files found

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` — PostgreSQL connection string (consumed by Prisma)
- `JWT_SECRET` — Secret for JWT signing (fallback: `dev-secret-change-in-production` in `middleware.ts`)

**Secrets location:**
- `.env` and `.env.local` files at project root (not committed; gitignored)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

*Integration audit: 2026-04-22*
