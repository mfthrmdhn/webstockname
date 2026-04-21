import { describe, it, expect } from 'vitest'

// Margin formula: sum((unitPrice - unitCost) * qty) / sum(unitPrice * qty) * 100
// Source: 03-CONTEXT.md D-03, 03-UI-SPEC.md interaction rule 5
function calculateMarginPercent(
  items: Array<{ unitPrice: number; unitCost: number; quantity: number }>
): number | null {
  const revenue = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const cost    = items.reduce((s, i) => s + i.unitCost  * i.quantity, 0)
  if (revenue === 0) return null
  return parseFloat(((revenue - cost) / revenue * 100).toFixed(1))
}

describe('Margin% calculation (REPORT-04)', () => {
  it('calculates weighted margin across multiple items', () => {
    const items = [
      { unitPrice: 100, unitCost: 60, quantity: 2 },
      { unitPrice: 200, unitCost: 150, quantity: 1 },
    ]
    // revenue = 200 + 200 = 400, cost = 120 + 150 = 270
    // margin = (400 - 270) / 400 * 100 = 32.5
    expect(calculateMarginPercent(items)).toBe(32.5)
  })

  it('returns null when revenue is 0', () => {
    expect(calculateMarginPercent([])).toBeNull()
  })

  it('returns null when unitPrice is 0 for all items', () => {
    const items = [{ unitPrice: 0, unitCost: 0, quantity: 1 }]
    expect(calculateMarginPercent(items)).toBeNull()
  })

  it('handles zero unitCost (100% margin item)', () => {
    const items = [{ unitPrice: 100, unitCost: 0, quantity: 1 }]
    expect(calculateMarginPercent(items)).toBe(100.0)
  })

  it('rounds to one decimal place', () => {
    const items = [{ unitPrice: 3, unitCost: 1, quantity: 1 }]
    // (3 - 1) / 3 * 100 = 66.666... -> 66.7
    expect(calculateMarginPercent(items)).toBe(66.7)
  })
})
