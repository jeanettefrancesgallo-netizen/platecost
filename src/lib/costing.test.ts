import { describe, expect, it } from 'vitest'
import { costPerBaseUnit, normalizeToBaseCurrency } from './costing'

describe('costPerBaseUnit', () => {
  it('computes cost per base unit with no yield loss', () => {
    // 1kg of beans (1000g) costing 500 -> 0.5 per gram
    expect(costPerBaseUnit(500, 1000, 100)).toBeCloseTo(0.5)
  })

  it('accounts for yield loss by inflating cost per usable base unit', () => {
    // 80% yield means only 800 of the 1000g purchased is usable
    expect(costPerBaseUnit(500, 1000, 80)).toBeCloseTo(0.625)
  })

  it('throws for a non-positive purchase quantity', () => {
    expect(() => costPerBaseUnit(500, 0, 100)).toThrow()
    expect(() => costPerBaseUnit(500, -1, 100)).toThrow()
  })

  it('throws for an out-of-range yield percent', () => {
    expect(() => costPerBaseUnit(500, 1000, 0)).toThrow()
    expect(() => costPerBaseUnit(500, 1000, 101)).toThrow()
  })
})

describe('normalizeToBaseCurrency', () => {
  it('multiplies by the exchange rate', () => {
    expect(normalizeToBaseCurrency(10, 56.5)).toBeCloseTo(565)
  })

  it('is a no-op at an exchange rate of 1', () => {
    expect(normalizeToBaseCurrency(42, 1)).toBe(42)
  })
})
