import { describe, expect, it } from 'vitest'
import { classifyCostPercent, recipeItemCost, recipeTotals } from './recipeCosting'

describe('recipeItemCost', () => {
  it('converts the line quantity into the ingredient base unit before costing', () => {
    // 0.5kg of an ingredient costing 0.5 per gram -> 500g * 0.5 = 250
    const cost = recipeItemCost({
      quantity: 0.5,
      unit: 'kg',
      ingredientBaseUnit: 'g',
      ingredientCostPerBaseUnit: 0.5,
      ingredientExchangeRateToBase: 1,
    })
    expect(cost).toBeCloseTo(250)
  })

  it('applies the exchange rate to normalize into the org base currency', () => {
    const cost = recipeItemCost({
      quantity: 100,
      unit: 'ml',
      ingredientBaseUnit: 'ml',
      ingredientCostPerBaseUnit: 1,
      ingredientExchangeRateToBase: 56.5,
    })
    expect(cost).toBeCloseTo(5650)
  })

  it('passes "each" quantities through unconverted', () => {
    const cost = recipeItemCost({
      quantity: 2,
      unit: 'each',
      ingredientBaseUnit: 'each',
      ingredientCostPerBaseUnit: 15,
      ingredientExchangeRateToBase: 1,
    })
    expect(cost).toBeCloseTo(30)
  })
})

describe('recipeTotals', () => {
  it('sums ingredient costs plus labor and packaging, divided across portions', () => {
    const totals = recipeTotals({
      itemCosts: [100, 50],
      laborCost: 20,
      packagingCost: 10,
      portions: 2,
      sellingPrice: 0,
    })
    expect(totals.ingredientsCost).toBe(150)
    expect(totals.totalCost).toBe(180)
    expect(totals.costPerPortion).toBe(90)
    expect(totals.costPercent).toBeNull()
    expect(totals.grossProfitPerPortion).toBeNull()
  })

  it('computes cost % and gross profit when a selling price is set', () => {
    const totals = recipeTotals({
      itemCosts: [60],
      laborCost: 0,
      packagingCost: 0,
      portions: 1,
      sellingPrice: 200,
    })
    expect(totals.costPercent).toBeCloseTo(30)
    expect(totals.grossProfitPerPortion).toBeCloseTo(140)
  })

  it('throws for non-positive portions', () => {
    expect(() =>
      recipeTotals({ itemCosts: [], laborCost: 0, packagingCost: 0, portions: 0, sellingPrice: 0 }),
    ).toThrow()
  })
})

describe('classifyCostPercent', () => {
  it('is good at or under the target', () => {
    expect(classifyCostPercent(28, 32)).toBe('good')
    expect(classifyCostPercent(32, 32)).toBe('good')
  })

  it('is a warning when modestly over target', () => {
    expect(classifyCostPercent(35, 32)).toBe('warning')
  })

  it('is bad when well over target', () => {
    expect(classifyCostPercent(40, 32)).toBe('bad')
  })

  it('is good with no target configured or no selling price', () => {
    expect(classifyCostPercent(50, null)).toBe('good')
    expect(classifyCostPercent(null, 32)).toBe('good')
  })
})
