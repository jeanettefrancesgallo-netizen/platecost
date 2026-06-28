import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { summarizeRecipe } from '@/features/recipes/recipeSummary'

export function useRecipeCostingReport(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'recipe-costing', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select(
          '*, recipe_items(quantity, unit, ingredients(base_unit, cost_per_base_unit, exchange_rate_to_base))',
        )
        .eq('organization_id', organizationId!)
        .order('type')
        .order('name')
      if (error) throw error

      return data.map((recipe) => ({
        id: recipe.id,
        name: recipe.name,
        type: recipe.type as 'food' | 'beverage',
        portions: recipe.portions,
        sellingPrice: recipe.selling_price,
        totals: summarizeRecipe(recipe),
      }))
    },
  })
}

export function useIngredientCostReport(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'ingredient-cost', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredients')
        .select('id, name, base_unit, cost_per_base_unit, ingredient_categories(name), suppliers(name)')
        .eq('organization_id', organizationId!)
        .order('name')
      if (error) throw error

      return data.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        categoryName: ingredient.ingredient_categories?.name ?? 'Uncategorized',
        supplierName: ingredient.suppliers?.name ?? '—',
        baseUnit: ingredient.base_unit,
        costPerBaseUnit: ingredient.cost_per_base_unit ?? 0,
      }))
    },
  })
}

export function useInventoryValuationReport(
  organizationId: string | undefined,
  locationId: string | undefined,
) {
  return useQuery({
    queryKey: ['reports', 'inventory-valuation', organizationId, locationId],
    enabled: !!organizationId && !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredients')
        .select(
          'id, name, base_unit, cost_per_base_unit, ingredient_categories(name), inventory_stock(quantity_on_hand)',
        )
        .eq('organization_id', organizationId!)
        .eq('inventory_stock.location_id', locationId!)
        .order('name')
      if (error) throw error

      return data.map((ingredient) => {
        const quantityOnHand = ingredient.inventory_stock[0]?.quantity_on_hand ?? 0
        const costPerBaseUnit = ingredient.cost_per_base_unit ?? 0
        return {
          id: ingredient.id,
          name: ingredient.name,
          categoryName: ingredient.ingredient_categories?.name ?? 'Uncategorized',
          baseUnit: ingredient.base_unit,
          quantityOnHand,
          costPerBaseUnit,
          value: quantityOnHand * costPerBaseUnit,
        }
      })
    },
  })
}
