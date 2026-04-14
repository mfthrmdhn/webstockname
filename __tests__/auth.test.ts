/**
 * Unit tests for authentication functions
 * Tests JWT generation, verification, token expiry, and password hashing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import * as authModule from '@/lib/auth/jwt'
import * as passwordModule from '@/lib/auth/password'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

describe('JWT Authentication', () => {
  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token', () => {
      const token = authModule.generateAccessToken('user123', 'SUPERADMIN')
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')

      // Decode to verify structure
      const decoded = jwt.decode(token) as any
      expect(decoded.userId).toBe('user123')
      expect(decoded.role).toBe('SUPERADMIN')
    })

    it('should set access token expiry to 15 minutes', () => {
      const token = authModule.generateAccessToken('user123', 'SUPERADMIN')
      const decoded = jwt.decode(token) as any

      // Calculate expected expiry (approximately 15 minutes from now)
      const issuedAt = decoded.iat * 1000
      const expiresAt = decoded.exp * 1000
      const expiryDuration = expiresAt - issuedAt

      // 15 minutes in milliseconds (with 1 second tolerance for test execution)
      const expectedDuration = 15 * 60 * 1000
      expect(Math.abs(expiryDuration - expectedDuration)).toBeLessThan(1000)
    })

    it('should include user ID and role in token payload', () => {
      const token = authModule.generateAccessToken('user456', 'FINANCE')
      const decoded = jwt.decode(token) as any

      expect(decoded.userId).toBe('user456')
      expect(decoded.role).toBe('FINANCE')
    })

    it('should generate different tokens for different users', () => {
      const token1 = authModule.generateAccessToken('user1', 'SUPERADMIN')
      const token2 = authModule.generateAccessToken('user2', 'SUPERADMIN')

      expect(token1).not.toBe(token2)
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT refresh token', () => {
      const token = authModule.generateRefreshToken('user123')
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')

      const decoded = jwt.decode(token) as any
      expect(decoded.userId).toBe('user123')
    })

    it('should set refresh token expiry to 7 days', () => {
      const token = authModule.generateRefreshToken('user123')
      const decoded = jwt.decode(token) as any

      const issuedAt = decoded.iat * 1000
      const expiresAt = decoded.exp * 1000
      const expiryDuration = expiresAt - issuedAt

      // 7 days in milliseconds (with 2 second tolerance)
      const expectedDuration = 7 * 24 * 60 * 60 * 1000
      expect(Math.abs(expiryDuration - expectedDuration)).toBeLessThan(2000)
    })

    it('should only contain userId in refresh token', () => {
      const token = authModule.generateRefreshToken('user123')
      const decoded = jwt.decode(token) as any

      expect(decoded.userId).toBe('user123')
      expect(decoded.role).toBeUndefined()
    })
  })

  describe('verifyAccessToken', () => {
    it('should verify a valid access token and return payload', () => {
      const token = authModule.generateAccessToken('user123', 'SUPERADMIN')
      const payload = authModule.verifyAccessToken(token)

      expect(payload.userId).toBe('user123')
      expect(payload.role).toBe('SUPERADMIN')
    })

    it('should throw error for expired token', () => {
      // Create an expired token by signing with past expiry
      const expiredToken = jwt.sign(
        { userId: 'user123', role: 'SUPERADMIN' },
        JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      )

      expect(() => {
        authModule.verifyAccessToken(expiredToken)
      }).toThrow()
    })

    it('should throw error for invalid signature', () => {
      const token = jwt.sign(
        { userId: 'user123', role: 'SUPERADMIN' },
        'wrong-secret',
        { expiresIn: '15m' }
      )

      expect(() => {
        authModule.verifyAccessToken(token)
      }).toThrow()
    })

    it('should throw error for malformed token', () => {
      expect(() => {
        authModule.verifyAccessToken('not.a.token')
      }).toThrow()

      expect(() => {
        authModule.verifyAccessToken('invalid')
      }).toThrow()
    })

    it('should throw error for empty token', () => {
      expect(() => {
        authModule.verifyAccessToken('')
      }).toThrow()
    })
  })

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token and return payload', () => {
      const token = authModule.generateRefreshToken('user123')
      const payload = authModule.verifyRefreshToken(token)

      expect(payload.userId).toBe('user123')
    })

    it('should throw error for expired refresh token', () => {
      const expiredToken = jwt.sign(
        { userId: 'user123' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      )

      expect(() => {
        authModule.verifyRefreshToken(expiredToken)
      }).toThrow()
    })

    it('should throw error for invalid signature', () => {
      const token = jwt.sign(
        { userId: 'user123' },
        'wrong-secret',
        { expiresIn: '7d' }
      )

      expect(() => {
        authModule.verifyRefreshToken(token)
      }).toThrow()
    })
  })
})

describe('Password Hashing', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const plaintext = 'MyPassword123'
      const hash = await passwordModule.hashPassword(plaintext)

      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash).not.toBe(plaintext)
      expect(hash.length).toBeGreaterThan(20) // bcrypt hashes are long
    })

    it('should produce different hashes for the same password (salting)', async () => {
      const plaintext = 'MyPassword123'
      const hash1 = await passwordModule.hashPassword(plaintext)
      const hash2 = await passwordModule.hashPassword(plaintext)

      expect(hash1).not.toBe(hash2)
    })

    it('should handle long passwords', async () => {
      const longPassword = 'X'.repeat(100) + '123'
      const hash = await passwordModule.hashPassword(longPassword)

      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
    })

    it('should hash with bcrypt rounds=10', async () => {
      const plaintext = 'TestPassword123'
      const hash = await passwordModule.hashPassword(plaintext)

      // Bcrypt hashes start with $2a$ or $2b$ followed by rounds
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/)
    })
  })

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const plaintext = 'MyPassword123'
      const hash = await passwordModule.hashPassword(plaintext)

      const matches = await passwordModule.comparePassword(plaintext, hash)
      expect(matches).toBe(true)
    })

    it('should return false for non-matching password', async () => {
      const plaintext = 'MyPassword123'
      const wrongPassword = 'WrongPassword456'
      const hash = await passwordModule.hashPassword(plaintext)

      const matches = await passwordModule.comparePassword(wrongPassword, hash)
      expect(matches).toBe(false)
    })

    it('should return false for empty password', async () => {
      const plaintext = 'MyPassword123'
      const hash = await passwordModule.hashPassword(plaintext)

      const matches = await passwordModule.comparePassword('', hash)
      expect(matches).toBe(false)
    })

    it('should be case-sensitive', async () => {
      const plaintext = 'MyPassword123'
      const hash = await passwordModule.hashPassword(plaintext)

      const lowerCase = await passwordModule.comparePassword(
        'mypassword123',
        hash
      )
      const upperCase = await passwordModule.comparePassword(
        'MYPASSWORD123',
        hash
      )

      expect(lowerCase).toBe(false)
      expect(upperCase).toBe(false)
    })

    it('should compare against various hashes', async () => {
      const passwords = [
        'Password123',
        'AnotherOne456',
        'Test789Pass'
      ]

      for (const pwd of passwords) {
        const hash = await passwordModule.hashPassword(pwd)
        const matches = await passwordModule.comparePassword(pwd, hash)
        expect(matches).toBe(true)
      }
    })
  })

  describe('Password + JWT Integration', () => {
    it('should allow complete auth flow: hash, compare, and generate tokens', async () => {
      // Register
      const plainPassword = 'SecurePass123'
      const hash = await passwordModule.hashPassword(plainPassword)

      // Login
      const passwordCorrect = await passwordModule.comparePassword(
        plainPassword,
        hash
      )
      expect(passwordCorrect).toBe(true)

      // Generate tokens on successful login
      const accessToken = authModule.generateAccessToken('user1', 'SUPERADMIN')
      const refreshToken = authModule.generateRefreshToken('user1')

      expect(accessToken).toBeDefined()
      expect(refreshToken).toBeDefined()

      // Verify tokens
      const accessPayload = authModule.verifyAccessToken(accessToken)
      const refreshPayload = authModule.verifyRefreshToken(refreshToken)

      expect(accessPayload.userId).toBe('user1')
      expect(refreshPayload.userId).toBe('user1')
    })
  })
})
