import { describe, it } from 'vitest'

describe('GET /api/reports/sales (REPORT-01, REPORT-02)', () => {
  it.todo('returns 200 with sale list containing id, createdAt, salesperson, products, total, paymentMethod, marginPercent')
  it.todo('returns pagination object with page, limit, total, pages')
  it.todo('filters results to the provided start and end date range')
  it.todo('calculates correct revenue total across all sales in range (REPORT-02)')
  it.todo('returns 401 when no Authorization header provided')
  it.todo('returns 403 when called with CASHIER role token')
  it.todo('returns 200 when called with FINANCE role token')
  it.todo('returns 200 when called with SUPERADMIN role token')
})
