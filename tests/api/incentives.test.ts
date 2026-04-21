import { describe, it } from 'vitest'

describe('POST /api/incentives (INCENT-01, INCENT-03, AUDIT-04)', () => {
  it.todo('creates incentive record with salespersonId, enteredById, amount, date, note')
  it.todo('returns 201 with incentive id and amount')
  it.todo('calls logAction with INCENTIVE_CREATE action type after successful create')
  it.todo('returns 400 when note is empty string')
  it.todo('returns 400 when amount is negative')
  it.todo('returns 400 when date is not YYYY-MM-DD format')
  it.todo('returns 401 when no Authorization header')
  it.todo('returns 403 when called with FINANCE role token (INCENT-04 RBAC)')
  it.todo('returns 403 when called with CASHIER role token')
})

describe('GET /api/incentives (INCENT-02)', () => {
  it.todo('returns list of incentives with salesperson username, enteredBy username, amount, date, note')
  it.todo('filters by date field (period date) not createdAt when start and end params provided')
  it.todo('returns pagination object')
  it.todo('returns 401 when no Authorization header')
  it.todo('returns 200 when FINANCE role token provided')
  it.todo('returns 200 when SUPERADMIN role token provided')
})
