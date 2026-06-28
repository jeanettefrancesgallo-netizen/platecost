import { convertToBaseUnit, type BaseUnit } from './units'
import { normalizeToBaseCurrency } from './costing'

export interface RecipeItemCostInput {
  quantity: number
  unit: string
  ingredientBaseUnit: BaseUnit
  ingredientCostPerBaseUnit: number
  ingredientExchangeRateToBase: number
}

/** Cost of a single recipe line, normalized into the org's base currency. */
export function recipeItemCost(input: RecipeItemCostInput): number {
  const quantityInBase = convertToBaseUnit(input.quantity, input.unit, input.ingredientBaseUnit)
  const costInPurchaseCurrency = quantityInBase * input.ingredientCostPerBaseUnit
  return normalizeToBaseCurrency(costInPurchaseCurrency, input.ingredientExchangeRateToBase)
}

export interface RecipeTotals {
  ingredientsCost: number
  totalCost: number
  costPerPortion: number
  /** null when there's no selling price to compare against. */
  costPercent: number | null
  grossProfitPerPortion: number | null
}

export function recipeTotals(input: {
  itemCosts: number[]
  laborCost: number
  packagingCost: number
  portions: number
  sellingPrice: number
}): RecipeTotals {
  if (input.portions <= 0) throw new Error('portions must be greater than 0')

  const ingredientsCost = input.itemCosts.reduce((sum, cost) => sum + cost, 0)
  const totalCost = ingredientsCost + input.laborCost + input.packagingCost
  const costPerPortion = totalCost / input.portions

  const hasSellingPrice = input.sellingPrice > 0
  return {
    ingredientsCost,
    totalCost,
    costPerPortion,
    costPercent: hasSellingPrice ? (costPerPortion / input.sellingPrice) * 100 : null,
    grossProfitPerPortion: hasSellingPrice ? input.sellingPrice - costPerPortion : null,
  }
}

export type CostHealth = 'good' | 'warning' | 'bad'

/**
 * Traffic-light classification of a cost % against the org's target band:
 * at/under the target max is "good", up to 5 points over is "warning"
 * (close enough to act on), and further over is "bad". No target band
 * configured -> always "good" (nothing to flag against).
 */
export function classifyCostPercent(
  costPercent: number | null,
  targetMax: number | null | undefined,
): CostHealth {
  if (costPercent === null || targetMax === null || targetMax === undefined) return 'good'
  if (costPercent <= targetMax) return 'good'
  if (costPercent <= targetMax + 5) return 'warning'
  return 'bad'
}
