import { recipeItemCost, recipeTotals, type RecipeTotals } from '@/lib/recipeCosting'
import type { BaseUnit } from '@/lib/units'

interface RecipeItemLike {
  quantity: number
  unit: string
  ingredients: {
    base_unit: string
    cost_per_base_unit: number | null
    exchange_rate_to_base: number
  } | null
}

interface RecipeLike {
  recipe_items: RecipeItemLike[]
  labor_cost: number
  packaging_cost: number
  portions: number
  selling_price: number
}

/** Computes recipe totals from a recipe row joined with its items + ingredients. */
export function summarizeRecipe(recipe: RecipeLike): RecipeTotals {
  const itemCosts = recipe.recipe_items
    .filter((item) => item.ingredients !== null)
    .map((item) =>
      recipeItemCost({
        quantity: item.quantity,
        unit: item.unit,
        ingredientBaseUnit: item.ingredients!.base_unit as BaseUnit,
        ingredientCostPerBaseUnit: item.ingredients!.cost_per_base_unit ?? 0,
        ingredientExchangeRateToBase: item.ingredients!.exchange_rate_to_base,
      }),
    )

  return recipeTotals({
    itemCosts,
    laborCost: recipe.labor_cost,
    packagingCost: recipe.packaging_cost,
    portions: recipe.portions,
    sellingPrice: recipe.selling_price,
  })
}
