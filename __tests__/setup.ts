/**
 * Test setup for integration tests
 * Configures test environment and provides utilities
 */

import { vi } from 'vitest'

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key-for-testing-only'
process.env.NODE_ENV = 'test'

// Setup global test utilities if needed
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
}
