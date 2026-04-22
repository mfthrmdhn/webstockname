# Coding Conventions

**Analysis Date:** 2026-04-22

## Naming Patterns

**Files:**
- Next.js App Router pages: `page.tsx` inside named route directories (e.g., `app/admin/users/page.tsx`)
- Next.js API routes: `route.ts` inside named route directories (e.g., `app/api/users/route.ts`)
- Middleware files: camelCase with descriptive suffix (e.g., `middleware/auth.ts`, `middleware/rbac.ts`)
- Library files: camelCase (e.g., `lib/auth/jwt.ts`, `lib/auth/password.ts`, `lib/audit/logger.ts`)
- Utility files: lowercase (e.g., `lib/utils.ts`, `lib/db.ts`)

**Functions:**
- Async handler functions: camelCase verb+noun (e.g., `authMiddleware`, `rbacMiddleware`, `logAction`)
- API route handlers: uppercase HTTP method names — `GET`, `POST`, `PATCH`, `DELETE`
- Utility/helper functions: camelCase verb+noun (e.g., `generateAccessToken`, `comparePassword`, `hashPassword`, `createBearerToken`)
- React components: PascalCase (e.g., `UsersPage`, `AdminLayout`)

**Variables:**
- camelCase throughout (e.g., `accessToken`, `refreshTokenRaw`, `passwordHash`, `isActiveParam`)
- Boolean variables prefixed with `is` or `has` (e.g., `isActive`, `isActiveParam`, `passwordMatch`)

**Types/Interfaces:**
- PascalCase (e.g., `AuthenticatedRequest`, `TokenPayload`, `User`)
- Interfaces for request extensions and data shapes (e.g., `interface User { id: string; ... }`)
- Zod schemas named with `Schema` suffix (e.g., `createUserSchema`, `updateUserSchema`, `editUserSchema`)

**Constants/Env:**
- Env vars: SCREAMING_SNAKE_CASE (e.g., `JWT_SECRET`, `DATABASE_URL`, `NODE_ENV`)

## Code Style

**Formatting:**
- Single quotes for strings (TypeScript/TSX files)
- 2-space indentation
- No trailing semicolons detected in some files; semicolons present in most API routes
- Trailing commas in multi-line arrays and objects (shadcn/ui imports)

**Linting:**
- ESLint config not explicitly present in root; likely inherits from Next.js default config
- TypeScript strict mode not confirmed but types are used throughout

## Import Organization

**Order (observed pattern):**
1. Framework/runtime imports (`next/server`, `react`)
2. Internal `@/` aliased imports (middleware, lib, components)
3. Node built-ins (`crypto`)

**Path Aliases:**
- `@/` maps to project root (configured in `vitest.config.ts` and `tsconfig.json`)
- Used consistently across all source files: `@/lib/auth/jwt`, `@/middleware/auth`, `@/components/ui/button`

**Dynamic Imports:**
- Prisma client is lazy-loaded via dynamic import inside handlers to avoid edge runtime issues:
  ```typescript
  const prisma = (await import('@/lib/db')).default
  ```

## Error Handling

**API Route Pattern:**
- Auth/RBAC middleware runs first; returns early if it returns a `NextResponse`
- Main logic wrapped in `try/catch`
- Specific errors returned with appropriate status codes (400, 401, 403, 404)
- Generic fallback: `{ error: 'Internal server error' }` with status 500
- `console.error` used for server-side error logging

```typescript
export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['SUPERADMIN'])(request as AuthenticatedRequest)
  if (rbacResult) return rbacResult

  try {
    // ... handler logic
  } catch (error) {
    console.error('Context error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Middleware Pattern:**
- Middleware functions return `null` to signal "continue" or a `NextResponse` to signal "stop"
- Auth middleware: returns 401 on missing/invalid token
- RBAC middleware: factory function accepting `allowedRoles: string[]`, returns 403 on forbidden role

**Validation Pattern:**
- Zod `safeParse` used (never `parse`) so errors can be returned gracefully:
  ```typescript
  const validation = createUserSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid input', details: validation.error.errors }, { status: 400 })
  }
  ```
- Validation schemas defined at module top-level, not inline

## Logging

**Framework:** `console.error` for errors; custom `logAction` from `lib/audit/logger.ts` for audit trail

**Audit Log Pattern:**
- `logAction(userId, 'ACTION_NAME', 'ENTITY_TYPE', entityId?)` called after successful mutations
- Actions observed: `LOGIN`, `USER_CREATE`
- Audit logging always follows successful DB write, never before

## Comments

**When to Comment:**
- JSDoc blocks on middleware and utility functions describing contract/behavior
- Inline comments on non-obvious logic (token hashing, cookie expiry math)
- TODO references use spec identifiers (e.g., `// D-15`, `// SALE-04`, `// AUDIT-05`)

**JSDoc Style:**
```typescript
/**
 * Authentication middleware that verifies JWT from Authorization header.
 * Extracts Bearer token, verifies with verifyAccessToken, and attaches user to request.
 * Returns 401 if token is missing, invalid, or expired.
 */
```

## Function Design

**Size:** Small, focused functions in `lib/` (single responsibility)

**Parameters:** Typed with TypeScript interfaces; middleware receives `AuthenticatedRequest`

**Return Values:**
- API handlers return `NextResponse.json(...)` always
- Middleware helpers return `NextResponse | null` (null = pass through)
- Library functions return typed values or throw on error

## Module Design

**Exports:** Named exports for utilities; default export for singleton (Prisma client in `lib/db.ts`)

**Barrel Files:** Not used; imports reference specific file paths

## Client Component Pattern

Frontend pages use `'use client'` directive at top of file. Zod schemas are duplicated between frontend (`app/admin/*/page.tsx`) and backend (`app/api/*/route.ts`) for independent validation on each side.

## RBAC Usage Pattern

Every protected API route applies middleware in this order:
1. `authMiddleware` — verifies JWT, attaches `request.user`
2. `rbacMiddleware(['ROLE1', 'ROLE2'])` — checks role against allowlist
3. Business logic

---

*Convention analysis: 2026-04-22*
