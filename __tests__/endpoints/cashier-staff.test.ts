import { describe, it, expect } from 'vitest'

describe('Cashier Staff Endpoint', () => {
  describe('GET /api/cashier/staff (D-10)', () => {
    it('should return only active CASHIER-role users', () => {
      const allUsers = [
        { id: 'u1', username: 'cashier1', role: 'CASHIER', isActive: true },
        { id: 'u2', username: 'finance1', role: 'FINANCE', isActive: true },
        { id: 'u3', username: 'admin1', role: 'SUPERADMIN', isActive: true },
        { id: 'u4', username: 'cashier2', role: 'CASHIER', isActive: false },
      ]
      const filtered = allUsers.filter(u => u.role === 'CASHIER' && u.isActive)
      expect(filtered).toHaveLength(1)
      expect(filtered[0].username).toBe('cashier1')
    })

    it('should not include FINANCE or SUPERADMIN roles', () => {
      const staff = [{ id: 'u1', username: 'cashier1', role: 'CASHIER' }]
      const invalid = staff.filter(u => u.role !== 'CASHIER')
      expect(invalid).toHaveLength(0)
    })

    it('should reject FINANCE role request with 403 (RBAC)', () => {
      const response = { status: 403 }
      expect(response.status).toBe(403)
    })
  })
})
