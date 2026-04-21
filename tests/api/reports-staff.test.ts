import { describe, it } from 'vitest'

describe('GET /api/reports/staff (REPORT-03)', () => {
  it.todo('returns array with one entry per salesperson: salespersonId, salesperson, salesCount, totalRevenue, itemsSold')
  it.todo('aggregates multiple sales by the same salesperson correctly')
  it.todo('filters by provided date range')
  it.todo('returns 401 when no Authorization header')
  it.todo('returns 403 when CASHIER role')
  it.todo('returns 200 when FINANCE role')
})
