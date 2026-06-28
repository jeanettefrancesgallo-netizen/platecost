import { pourCosting, recipeItemCost, recipeTotals, type RecipeTotals } from '@/lib/recipeCosting'
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
  bottle_size_ml: number | null
  bottle_cost: number | null
  pour_size_ml: number | null
}

/**
 * Computes recipe totals from a recipe row joined with its items +
 * ingredients. For a beverage recipe with bottle/pour fields set, the pour
 * cost of the primary spirit is folded in alongside any mixer/garnish
 * recipe_items, so a full cocktail prices correctly.
 */
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

  if (recipe.bottle_size_ml && recipe.bottle_cost !== null && recipe.pour_size_ml) {
    itemCosts.push(
      pourCosting({
        bottleSizeMl: recipe.bottle_size_ml,
        bottleCost: recipe.bottle_cost,
        pourSizeMl: recipe.pour_size_ml,
      }).costPerPour,
    )
  }

  return recipeTotals({
    itemCosts,
    laborCost: recipe.labor_cost,
    packagingCost: recipe.packaging_cost,
    portions: recipe.portions,
    sellingPrice: recipe.selling_price,
  })
}
