/**
 * Tests for Phase 3 report API routes
 * RED: these tests will fail until routes are implemented
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAuthHeaders } from '@/__tests__/test-utils'

// Mock Prisma
vi.mock('@/lib/db', () => ({
  default: {
    sale: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}))

// Mock auth middleware to allow testing RBAC
vi.mock('@/middleware/auth', () => ({
  authMiddleware: vi.fn(async (req) => {
    const auth = req.headers.get('authorization')
    if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    return null
  }),
  AuthenticatedRequest: {},
}))

vi.mock('@/middleware/rbac', () => ({
  rbacMiddleware: vi.fn((roles: string[]) => async (req: Request) => {
    const auth = req.headers.get('authorization')
    if (!auth) return null
    // Decode role from test token
    try {
      const token = auth.replace('Bearer ', '')
      const parts = token.split('.')
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
      if (!roles.includes(payload.role)) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
      }
    } catch {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }
    return null
  }),
}))

describe('GET /api/reports/sales', () => {
  it('exports a GET function', async () => {
    const mod = await import('@/app/api/reports/sales/route')
    expect(typeof mod.GET).toBe('function')
  })

  it('returns 401 without auth', async () => {
    const { GET } = await import('@/app/api/reports/sales/route')
    const req = new Request('http://localhost/api/reports/sales')
    const res = await GET(req as any)
    expect(res.status).toBe(401)
  })

  it('returns 403 for CASHIER role', async () => {
    const { GET } = await import('@/app/api/reports/sales/route')
    const headers = createAuthHeaders('cashier-id', 'CASHIER')
    const req = new Request('http://localhost/api/reports/sales', { headers })
    const res = await GET(req as any)
    expect(res.status).toBe(403)
  })
})

describe('GET /api/reports/staff', () => {
  it('exports a GET function', async () => {
    const mod = await import('@/app/api/reports/staff/route')
    expect(typeof mod.GET).toBe('function')
  })

  it('returns 401 without auth', async () => {
    const { GET } = await import('@/app/api/reports/staff/route')
    const req = new Request('http://localhost/api/reports/staff')
    const res = await GET(req as any)
    expect(res.status).toBe(401)
  })
})

describe('GET /api/reports/reconciliation', () => {
  it('exports a GET function', async () => {
    const mod = await import('@/app/api/reports/reconciliation/route')
    expect(typeof mod.GET).toBe('function')
  })

  it('returns 401 without auth', async () => {
    const { GET } = await import('@/app/api/reports/reconciliation/route')
    const req = new Request('http://localhost/api/reports/reconciliation')
    const res = await GET(req as any)
    expect(res.status).toBe(401)
  })
})
