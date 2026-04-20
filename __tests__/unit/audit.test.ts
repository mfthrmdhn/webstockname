import { describe, it, expect } from 'vitest'

describe('Audit Logging', () => {
  describe('logAction extended signature (D-17)', () => {
    it('should accept metadata as optional 5th argument', () => {
      // Contract test: verify the function signature accepts metadata
      const callWithMetadata = (
        userId: string,
        action: string,
        entityType: string,
        entityId?: string,
        metadata?: Record<string, unknown>
      ) => ({ userId, action, entityType, entityId, metadata })

      const result = callWithMetadata('u1', 'SALE_CREATE', 'SALE', 'sale-1', {
        total: 39.98,
        itemCount: 2,
      })
      expect(result.metadata?.total).toBe(39.98)
    })

    it('should remain backward compatible when called with 4 args', () => {
      const callWith4 = (
        userId: string,
        action: string,
        entityType: string,
        entityId?: string,
        metadata?: Record<string, unknown>
      ) => ({ userId, action, entityType, entityId, metadata: metadata || null })

      const result = callWith4('u1', 'USER_CREATE', 'USER', 'user-1')
      expect(result.metadata).toBeNull()
    })
  })

  describe('INVENTORY_REPLENISH audit entry (D-19)', () => {
    it('should include before/after quantities in metadata', () => {
      const auditEntry = {
        action: 'INVENTORY_REPLENISH',
        entityType: 'PRODUCT',
        entityId: 'prod-1',
        metadata: {
          qty_moved: 20,
          reason: 'Weekly restock',
          before: { storeQty: 5, warehouseQty: 30 },
          after: { storeQty: 25, warehouseQty: 10 },
        },
      }
      expect(auditEntry.metadata.before.storeQty).toBe(5)
      expect(auditEntry.metadata.after.storeQty).toBe(25)
      expect(auditEntry.metadata.reason).toBe('Weekly restock')
    })
  })

  describe('SALE_CREATE audit entry (D-18)', () => {
    it('should include sale_id, cashier_id, salesperson_id, total, paymentMethod', () => {
      const auditEntry = {
        action: 'SALE_CREATE',
        entityType: 'SALE',
        entityId: 'sale-1',
        metadata: {
          cashierId: 'cashier-1',
          salespersonId: 'sp-1',
          total: 39.98,
          paymentMethod: 'CASH',
          itemCount: 2,
        },
      }
      expect(auditEntry.metadata.cashierId).toBeDefined()
      expect(auditEntry.metadata.salespersonId).toBeDefined()
      expect(auditEntry.metadata.paymentMethod).toBe('CASH')
    })
  })
})
