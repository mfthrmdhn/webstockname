# Testing Patterns

**Analysis Date:** 2026-04-22

## Test Framework

**Runner:**
- Vitest `^4.1.4`
- Config: `vitest.config.ts`
- Globals: enabled (`globals: true`)
- Environment: `node`

**Assertion Library:**
- Vitest built-in (`expect`)

**Coverage:**
- Provider: `v8` (via `@vitest/coverage-v8 ^4.1.4`)
- Reporters: `text`, `json`, `html`
- Coverage scope: `lib/**/*.ts`, `middleware/**/*.ts`

**Run Commands:**
```bash
npm test                   # Run all tests (watch mode)
npm run test:ui            # Vitest browser UI
npm run test:coverage      # Coverage report
npm run test:integration   # Integration tests with DATABASE_URL
```

## Test File Organization

**Locations:**
- `__tests__/` — primary test directory (unit, endpoint, integration)
- `tests/` — secondary location for some API and lib tests (appears to be an older or parallel structure)

**Directory Structure:**
```
__tests__/
├── setup.ts               # Global test setup (env vars, console mocks)
├── test-utils.ts          # Shared factories and request helpers
├── auth.test.ts           # JWT and password unit tests
├── middleware.test.ts     # Middleware unit tests
├── unit/
│   ├── audit.test.ts
│   ├── inventory.test.ts
│   └── sales.test.ts
├── endpoints/
│   ├── auth-endpoints.test.ts
│   ├── audit.test.ts
│   ├── cashier-staff.test.ts
│   ├── inventory.test.ts
│   ├── rbac.test.ts
│   ├── sales.test.ts
│   └── users.test.ts
├── api/
│   ├── incentives/
│   └── reports/
└── integration/
    └── concurrent-sale.test.ts

tests/                     # Secondary test location
├── lib/margin.test.ts
└── api/
    ├── audit.test.ts
    ├── incentives.test.ts
    ├── reports-sales.test.ts
    └── reports-staff.test.ts
```

**Naming:**
- Test files: `{feature}.test.ts` or `{feature}-{subfeature}.test.ts`
- Test files co-located in `__tests__/` mirroring feature domains, not source file paths

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('Feature Name (SPEC-REF)', () => {
  describe('sub-feature or method', () => {
    it('should describe expected behavior', () => {
      // arrange
      // act
      // assert
      expect(result).toBe(expected)
    })
  })
})
```

**Spec References:**
- Tests reference planning spec IDs in `describe` labels (e.g., `REPORT-01`, `AUDIT-05`, `D-15`, `SALE-04`)
- This ties tests directly to requirements/specs

**Pending Tests:**
- `it.todo('description')` used heavily in `tests/api/` for not-yet-implemented API tests
- This is the pattern for planning tests before implementation

## Mocking

**Framework:** Vitest `vi`

**Global Setup (`__tests__/setup.ts`):**
```typescript
import { vi } from 'vitest'

process.env.JWT_SECRET = 'test-secret-key-for-testing-only'
process.env.NODE_ENV = 'test'

global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
}
```

**Module Mocking Pattern:**
```typescript
import * as authModule from '@/lib/auth/jwt'
import * as passwordModule from '@/lib/auth/password'
// then spy or mock specific exports
```

**What to Mock:**
- `console.error` and `console.warn` suppressed globally in test setup
- Environment variables set in `setup.ts` (JWT_SECRET, NODE_ENV)
- Prisma client: mock when testing middleware/handlers in isolation

**What NOT to Mock:**
- Pure business logic functions (margin calc, stock validation, price snapshot) — test these directly
- JWT sign/verify — tested against real `jsonwebtoken` library with test secret

## Fixtures and Factories

**Test Data (`__tests__/test-utils.ts`):**
```typescript
export const testUsers = {
  superadmin: { username: 'superadmin', password: 'AdminPass123', role: 'SUPERADMIN', id: 'superadmin-id-001' },
  finance:    { username: 'finance_user', password: 'FinancePass123', role: 'FINANCE', id: 'finance-id-001' },
  cashier:    { username: 'cashier_user', password: 'CashierPass123', role: 'CASHIER', id: 'cashier-id-001' }
}
```

**Auth Helpers (`__tests__/test-utils.ts`):**
```typescript
export function createBearerToken(userId: string, role: string): string
export function createAuthHeaders(userId: string, role: string): Record<string, string>
export function createBaseHeaders(): Record<string, string>
export async function makeRequest(method, url, options?): Promise<Request>
```

**Location:** `__tests__/test-utils.ts`

## Coverage

**Requirements:** No enforced coverage threshold in `vitest.config.ts`

**Scope:** `lib/**/*.ts` and `middleware/**/*.ts` (not `app/` pages or API routes)

**View Coverage:**
```bash
npm run test:coverage
# HTML report generated at: coverage/index.html
```

## Test Types

**Unit Tests (`__tests__/unit/`, `__tests__/auth.test.ts`, `tests/lib/`):**
- Scope: Pure business logic functions, isolated from DB and HTTP
- Pattern: Pass inline data, assert return values
- Examples: margin calculation, stock validation logic, JWT signing, password hashing

**Endpoint/Contract Tests (`__tests__/endpoints/`):**
- Scope: RBAC contracts and response shape contracts
- Pattern: Hardcoded mock response objects asserting status codes and body structure (not actual HTTP calls)
- Limitation: Many tests use hardcoded `response = { status: 201, body: {...} }` objects rather than real HTTP calls — they assert contracts, not live behavior

**Integration Tests (`__tests__/integration/`):**
- Scope: Concurrent operations (e.g., `concurrent-sale.test.ts`)
- Requires: `DATABASE_URL` env var — run via `npm run test:integration`

**Pending/Planned Tests (`tests/api/`):**
- All tests use `it.todo(...)` — represent planned but not yet implemented API tests
- Cover: reports-sales, reports-staff, audit logs, incentives

## Common Patterns

**Async Testing:**
```typescript
it('should generate a valid JWT access token', () => {
  const token = authModule.generateAccessToken('user123', 'SUPERADMIN')
  const decoded = jwt.decode(token) as any
  expect(decoded.userId).toBe('user123')
})
```

**Business Logic Testing (inline, no mocks):**
```typescript
it('should reject entire cart if any single item is insufficient', () => {
  const items = [
    { productId: 'p1', quantity: 2, store_qty: 5 },
    { productId: 'p2', quantity: 10, store_qty: 3 },
  ]
  const failed = items.find(i => i.store_qty < i.quantity)
  expect(failed).toBeDefined()
  expect(failed?.productId).toBe('p2')
})
```

**Numeric Precision:**
```typescript
expect(total).toBeCloseTo(44.98)      // For floating point sums
expect(margin).toBe(66.7)             // For rounded results (toFixed(1) output)
```

**RBAC Contract Pattern:**
```typescript
it('should return 403 for FINANCE trying to create user', async () => {
  const response = { status: 403, body: { error: 'Insufficient permissions' } }
  expect(response.status).toBe(403)
})
```

---

*Testing analysis: 2026-04-22*
