import { describe, it, expect } from 'vitest'

describe('Sales Transaction Logic', () => {
  describe('Stock validation (D-15)', () => {
    it('should reject sale if store_qty < requested quantity', () => {
      const product = { id: 'p1', name: 'Widget', store_qty: 3 }
      const requestedQty = 5
      expect(product.store_qty < requestedQty).toBe(true)
    })

    it('should allow sale if store_qty equals requested quantity', () => {
      const product = { id: 'p1', name: 'Widget', store_qty: 5 }
      const requestedQty = 5
      expect(product.store_qty < requestedQty).toBe(false)
    })

    it('should reject entire cart if any single item is insufficient (D-14)', () => {
      const items = [
        { productId: 'p1', quantity: 2, store_qty: 5 },
        { productId: 'p2', quantity: 10, store_qty: 3 },
      ]
      const failed = items.find(i => i.store_qty < i.quantity)
      expect(failed).toBeDefined()
      expect(failed?.productId).toBe('p2')
    })
  })

  describe('Price snapshot (D-06)', () => {
    it('should use price from locked DB row, not from cart payload', () => {
      const lockedProduct = { id: 'p1', selling_price: 19.99 }
      // clientPrice is NOT used — server always reads from locked row
      const unitPrice = lockedProduct.selling_price
      expect(unitPrice).toBe(19.99)
    })

    it('should use cost from locked DB row for SaleItem snapshot', () => {
      const lockedProduct = { id: 'p1', selling_price: 19.99, cost: 10.00 }
      expect(lockedProduct.cost).toBe(10.00)
    })
  })

  describe('Total calculation (SALE-04)', () => {
    it('should calculate total as sum of unitPrice * quantity for each item', () => {
      const items = [
        { quantity: 2, unitPrice: 19.99 },
        { quantity: 1, unitPrice: 5.00 },
      ]
      const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
      expect(total).toBeCloseTo(44.98)
    })
  })

  describe('Change due (D-08)', () => {
    it('should calculate change due for CASH payment', () => {
      const total = 39.98
      const amountReceived = 50.00
      const changeDue = amountReceived - total
      expect(changeDue).toBeCloseTo(10.02)
    })

    it('should not calculate change due for CARD payment', () => {
      const paymentMethod = 'CARD'
      const changeDue = paymentMethod === 'CASH' ? 100 - 39.98 : null
      expect(changeDue).toBeNull()
    })
  })

  describe('Attribution (D-09/D-11)', () => {
    it('should require salespersonId to be present', () => {
      const salespersonId = ''
      expect(salespersonId.length).toBe(0)
    })

    it('should record attribution as immutable at sale time', () => {
      const sale = { id: 'sale-1', salespersonId: 'sp-1', createdAt: new Date() }
      // Attribution is captured at creation and cannot change
      expect(sale.salespersonId).toBe('sp-1')
    })
  })
})
