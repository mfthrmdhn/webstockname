/**
 * Test utilities for integration testing
 * Provides helper functions for creating test data and making test requests
 */

import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt'
import { hashPassword } from '@/lib/auth/password'

/**
 * Create a Bearer token for testing
 */
export function createBearerToken(userId: string, role: string): string {
  return `Bearer ${generateAccessToken(userId, role)}`
}

/**
 * Extract role from access token for testing
 */
export function extractRoleFromToken(token: string): string | null {
  try {
    // Remove 'Bearer ' prefix if present
    const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token

    // Parse JWT
    const parts = actualToken.split('.')
    if (parts.length !== 3) return null

    const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    return decoded.role || null
  } catch {
    return null
  }
}

/**
 * Create test request headers with authentication
 */
export function createAuthHeaders(userId: string, role: string) {
  return {
    'Authorization': createBearerToken(userId, role),
    'Content-Type': 'application/json'
  }
}

/**
 * Create test request headers without authentication
 */
export function createBaseHeaders() {
  return {
    'Content-Type': 'application/json'
  }
}

/**
 * Test data factory for users
 */
export const testUsers = {
  superadmin: {
    username: 'superadmin',
    password: 'AdminPass123',
    role: 'SUPERADMIN',
    id: 'superadmin-id-001'
  },
  finance: {
    username: 'finance_user',
    password: 'FinancePass123',
    role: 'FINANCE',
    id: 'finance-id-001'
  },
  cashier: {
    username: 'cashier_user',
    password: 'CashierPass123',
    role: 'CASHIER',
    id: 'cashier-id-001'
  }
}

/**
 * Simulate a POST request to an API endpoint
 */
export async function makeRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  options?: {
    headers?: Record<string, string>
    body?: Record<string, unknown>
  }
) {
  const init: RequestInit = {
    method,
    headers: options?.headers || createBaseHeaders()
  }

  if (options?.body && (method === 'POST' || method === 'PATCH')) {
    init.body = JSON.stringify(options.body)
  }

  const request = new Request(url, init)
  return request
}

/**
 * Wait for async operations in tests
 */
export async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
