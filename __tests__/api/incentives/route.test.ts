/**
 * Tests for Phase 3 incentives API routes
 * RED: these tests will fail until routes are implemented
 */

import { describe, it, expect, vi } from 'vitest'
import { createAuthHeaders } from '@/__tests__/test-utils'

vi.mock('@/lib/db', () => ({
  default: {
    incentive: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/audit/logger', () => ({
  logAction: vi.fn(),
}))

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

describe('GET /api/incentives', () => {
  it('exports a GET function', async () => {
    const mod = await import('@/app/api/incentives/route')
    expect(typeof mod.GET).toBe('function')
  })

  it('exports a POST function', async () => {
    const mod = await import('@/app/api/incentives/route')
    expect(typeof mod.POST).toBe('function')
  })

  it('does NOT export PUT or DELETE', async () => {
    const mod = await import('@/app/api/incentives/route') as Record<string, unknown>
    expect(mod.PUT).toBeUndefined()
    expect(mod.DELETE).toBeUndefined()
  })

  it('returns 401 without auth', async () => {
    const { GET } = await import('@/app/api/incentives/route')
    const req = new Request('http://localhost/api/incentives')
    const res = await GET(req as any)
    expect(res.status).toBe(401)
  })

  it('returns 403 for CASHIER', async () => {
    const { GET } = await import('@/app/api/incentives/route')
    const headers = createAuthHeaders('cashier-id', 'CASHIER')
    const req = new Request('http://localhost/api/incentives', { headers })
    const res = await GET(req as any)
    expect(res.status).toBe(403)
  })
})

describe('POST /api/incentives', () => {
  it('returns 403 for FINANCE role', async () => {
    const { POST } = await import('@/app/api/incentives/route')
    const headers = createAuthHeaders('finance-id', 'FINANCE')
    const req = new Request('http://localhost/api/incentives', {
      method: 'POST',
      headers,
      body: JSON.stringify({ salespersonId: 'cuid1', amount: 100, date: '2026-01-01', note: 'test' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(403)
  })
})

describe('GET /api/incentives/cashiers', () => {
  it('exports a GET function', async () => {
    const mod = await import('@/app/api/incentives/cashiers/route')
    expect(typeof mod.GET).toBe('function')
  })
})
