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

export interface PourCosting {
  poursPerBottle: number
  costPerPour: number
  /**
   * Heuristic flag, not a measured fact: warns when the configured pour is
   * generous enough that fewer than 15 pours come out of the bottle (e.g.
   * a 750ml bottle poured at >50ml/pour), which is where over-pouring tends
   * to quietly erode margin. Adjust the threshold per bar policy if needed.
   */
  overPourRisk: boolean
}

const OVER_POUR_THRESHOLD_POURS_PER_BOTTLE = 15

export function pourCosting(input: {
  bottleSizeMl: number
  bottleCost: number
  pourSizeMl: number
}): PourCosting {
  if (input.bottleSizeMl <= 0) throw new Error('bottleSizeMl must be greater than 0')
  if (input.pourSizeMl <= 0) throw new Error('pourSizeMl must be greater than 0')

  const poursPerBottle = input.bottleSizeMl / input.pourSizeMl
  const costPerPour = input.bottleCost / poursPerBottle

  return {
    poursPerBottle,
    costPerPour,
    overPourRisk: poursPerBottle < OVER_POUR_THRESHOLD_POURS_PER_BOTTLE,
  }
}

export type CostHealth = 'good' | 'warning' | 'bad'

/**
 * Traffic-light classification of a cost % against the org's target band:
 * at/under the target max is "good", up to 5 points over is "warning"
 * (close enough to act on), and further over is "bad". No target band
 * configured -> always "good" (nothing to flag against).
 */
export type MenuEngineeringQuadrant = 'star' | 'plowhorse' | 'puzzle' | 'dog'

/**
 * Classic menu engineering plots profitability against sales popularity, but
 * this app has no POS/sales integration to know what actually sells. As a
 * stand-in until that exists, the second axis uses cost % (cheaper to make
 * is treated as a proxy for "easier to sell profitably") instead of real
 * popularity — so treat this as a cost/margin health check, not a verified
 * sales-mix classification.
 */
export function classifyMenuEngineering(input: {
  grossProfitPerPortion: number | null
  avgGrossProfitPerPortion: number
  costPercent: number | null
  avgCostPercent: number
}): MenuEngineeringQuadrant | null {
  if (input.grossProfitPerPortion === null || input.costPercent === null) return null

  const highMargin = input.grossProfitPerPortion >= input.avgGrossProfitPerPortion
  const lowCost = input.costPercent <= input.avgCostPercent

  if (highMargin && lowCost) return 'star'
  if (!highMargin && lowCost) return 'plowhorse'
  if (highMargin && !lowCost) return 'puzzle'
  return 'dog'
}

export function classifyCostPercent(
  costPercent: number | null,
  targetMax: number | null | undefined,
): CostHealth {
  if (costPercent === null || targetMax === null || targetMax === undefined) return 'good'
  if (costPercent <= targetMax) return 'good'
  if (costPercent <= targetMax + 5) return 'warning'
  return 'bad'
}
