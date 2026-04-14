/**
 * Unit tests for authentication and RBAC middleware
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { authMiddleware, type AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'
import { generateAccessToken } from '@/lib/auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

describe('Auth Middleware', () => {
  describe('authMiddleware', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const request = new NextRequest(new Request('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {}
      })) as AuthenticatedRequest

      const result = await authMiddleware(request)

      expect(result).toBeInstanceOf(NextResponse)
      expect(result?.status).toBe(401)

      const body = await result?.json()
      expect(body?.error).toContain('Missing or invalid authorization header')
    })

    it('should return 401 when Authorization header does not start with Bearer', async () => {
      const request = new NextRequest(new Request('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'Authorization': 'Basic dXNlcjpwYXNz'
        }
      })) as AuthenticatedRequest

      const result = await authMiddleware(request)

      expect(result?.status).toBe(401)
    })

    it('should return 401 for invalid token', async () => {
      const request = new NextRequest(new Request('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid.token.here'
        }
      })) as AuthenticatedRequest

      const result = await authMiddleware(request)

      expect(result?.status).toBe(401)
      const body = await result?.json()
      expect(body?.error).toContain('Invalid or expired token')
    })

    it('should return null and attach user to request for valid token', async () => {
      const token = generateAccessToken('user123', 'SUPERADMIN')

      const request = new NextRequest(new Request('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })) as AuthenticatedRequest

      const result = await authMiddleware(request)

      expect(result).toBeNull()
      expect(request.user).toBeDefined()
      expect(request.user?.userId).toBe('user123')
      expect(request.user?.role).toBe('SUPERADMIN')
    })

    it('should handle empty Bearer token', async () => {
      const request = new NextRequest(new Request('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer '
        }
      })) as AuthenticatedRequest

      const result = await authMiddleware(request)

      expect(result?.status).toBe(401)
    })
  })
})

describe('RBAC Middleware', () => {
  describe('rbacMiddleware', () => {
    it('should return 401 when user is not authenticated', async () => {
      const request = new NextRequest(new Request('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {}
      })) as AuthenticatedRequest

      const middleware = rbacMiddleware(['SUPERADMIN'])
      const result = await middleware(request)

      expect(result?.status).toBe(401)
      const body = await result?.json()
      expect(body?.error).toContain('not authenticated')
    })

    it('should return 403 when user role is not in allowed roles', async () => {
      const request = new NextRequest(new Request('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {}
      })) as AuthenticatedRequest

      request.user = {
        userId: 'user123',
        role: 'CASHIER'
      }

      const middleware = rbacMiddleware(['SUPERADMIN', 'FINANCE'])
      const result = await middleware(request)

      expect(result?.status).toBe(403)
      const body = await result?.json()
      expect(body?.error).toContain('Insufficient permissions')
    })

    it('should return null when user role is in allowed roles', async () => {
      const request = new NextRequest(new Request('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {}
      })) as AuthenticatedRequest

      request.user = {
        userId: 'user123',
        role: 'SUPERADMIN'
      }

      const middleware = rbacMiddleware(['SUPERADMIN', 'FINANCE'])
      const result = await middleware(request)

      expect(result).toBeNull()
    })

    it('should handle single role in array', async () => {
      const request = new NextRequest(new Request('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {}
      })) as AuthenticatedRequest

      request.user = {
        userId: 'user123',
        role: 'FINANCE'
      }

      const middleware = rbacMiddleware(['FINANCE'])
      const result = await middleware(request)

      expect(result).toBeNull()
    })

    it('should handle empty allowed roles array', async () => {
      const request = new NextRequest(new Request('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {}
      })) as AuthenticatedRequest

      request.user = {
        userId: 'user123',
        role: 'SUPERADMIN'
      }

      const middleware = rbacMiddleware([])
      const result = await middleware(request)

      expect(result?.status).toBe(403)
    })

    it('should be case-sensitive for role matching', async () => {
      const request = new NextRequest(new Request('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {}
      })) as AuthenticatedRequest

      request.user = {
        userId: 'user123',
        role: 'superadmin' // lowercase
      }

      const middleware = rbacMiddleware(['SUPERADMIN'])
      const result = await middleware(request)

      expect(result?.status).toBe(403)
    })
  })

  describe('RBAC + Auth Middleware Integration', () => {
    it('should enforce both auth and RBAC in sequence', async () => {
      // First middleware (auth) missing token
      const request = new NextRequest(new Request('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {}
      })) as AuthenticatedRequest

      const authResult = await authMiddleware(request)
      expect(authResult?.status).toBe(401)

      // Even if auth passes, RBAC should be checked next
      const token = generateAccessToken('user123', 'CASHIER')
      const request2 = new NextRequest(new Request('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })) as AuthenticatedRequest

      const authResult2 = await authMiddleware(request2)
      expect(authResult2).toBeNull()

      // Now check RBAC - CASHIER trying to access SUPERADMIN endpoint
      const rbacMiddleware_ = rbacMiddleware(['SUPERADMIN'])
      const rbacResult = await rbacMiddleware_(request2)
      expect(rbacResult?.status).toBe(403)
    })
  })
})
