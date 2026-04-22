# Technology Stack

**Analysis Date:** 2026-04-22

## Languages

**Primary:**
- TypeScript 5.3+ - All application code (`app/`, `lib/`, `middleware/`, `components/`, `prisma/`)

**Secondary:**
- JavaScript (CJS) - Prisma seed compatibility shim (`prisma/seed.cjs`)

## Runtime

**Environment:**
- Node.js 22 LTS (confirmed via `node --version`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.2+ - Full-stack framework using App Router; API routes in `app/api/`; React Server Components enabled
- React 19.2+ - UI rendering; strict mode enabled via `next.config.ts`

**Testing:**
- Vitest 4.1+ - Test runner; configured in `vitest.config.ts`; environment: `node`
- @testing-library/react 16.3+ - React component testing
- @vitest/coverage-v8 4.1+ - Coverage reporting (text, JSON, HTML)
- jsdom 29+ - DOM environment for browser-context tests

**Build/Dev:**
- TypeScript 5.3 - Strict mode with all strict flags enabled; see `tsconfig.json`
- Tailwind CSS 4.2+ - Utility-first CSS; configured in `tailwind.config.ts`; content scans `app/` and `components/`
- PostCSS 8.5+ - CSS processing via `postcss.config.mjs`
- tsx 4.7+ - TypeScript execution for scripts and seed files

## Key Dependencies

**Critical:**
- `@prisma/client` 6.19.3 - Database ORM client; output to `.prisma/client` (custom path in `prisma/schema.prisma`)
- `prisma` 6.19.3 - Migration CLI; schema at `prisma/schema.prisma`
- `jose` 6.2+ - JWT verification in Edge runtime (`middleware.ts`); used for route protection
- `jsonwebtoken` 9.0+ - JWT signing/verification in Node.js API routes (`app/api/auth/`)
- `bcryptjs` 3.0+ - Password hashing on backend
- `zod` 4.3+ - Runtime validation for API payloads
- `axios` 1.15+ - HTTP client for frontend API calls

**Infrastructure:**
- `pg` 8.20+ - Raw PostgreSQL client (used alongside Prisma for direct queries if needed)
- `lucide-react` 1.8+ - Icon set used in UI components
- `class-variance-authority` 0.7+ - shadcn/ui variant utility
- `clsx` 2.1+ - Conditional class names utility
- `cmdk` 1.1+ - Command palette primitive (shadcn/ui)
- `dotenv` 17.4+ - Environment variable loading for seed and scripts

**Radix UI Primitives (devDependencies, used via shadcn/ui pattern):**
- `@radix-ui/react-dialog`, `@radix-ui/react-popover`, `@radix-ui/react-select`, `@radix-ui/react-slot`, `@radix-ui/react-tabs`

## Configuration

**Environment:**
- `.env` and `.env.local` files present (not read)
- Key env vars required: `DATABASE_URL`, `JWT_SECRET`
- Configured via `dotenv` in scripts; Next.js auto-loads `.env.local` in dev

**Build:**
- `next.config.ts` - `reactStrictMode: true`; `typescript.ignoreBuildErrors: true`
- `tsconfig.json` - Target: ES2020; strict mode fully enabled; path alias `@/*` maps to project root
- `tailwind.config.ts` - Content paths: `app/**`, `components/**`
- `vitest.config.ts` - Setup file: `__tests__/setup.ts`; coverage includes `lib/**/*.ts` and `middleware/**/*.ts`
- `prisma.config.ts` - Prisma configuration
- `postcss.config.mjs` - PostCSS with Tailwind plugin

## Platform Requirements

**Development:**
- Node.js 22 LTS
- Docker (PostgreSQL 16 via `docker-compose.yml`)
- PostgreSQL 16 container: `webstockname_db` on port 5432

**Production:**
- Next.js full-stack deployment (Vercel-compatible or self-hosted Node.js server)
- PostgreSQL 16+ database required
- No Redis dependency in current implementation

---

*Stack analysis: 2026-04-22*
