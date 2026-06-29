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

export interface CogsLineItem {
  ingredientId: string
  name: string
  baseUnit: string
  beginningQty: number
  purchasesQty: number
  endingQty: number
  beginningValue: number
  purchasesValue: number
  endingValue: number
  cogs: number
}

/**
 * Inventory movements are signed deltas (see apply_inventory_log in
 * 20260627223011_inventory.sql / 20260628161326_fix_inventory_adjustment_direction.sql):
 * received and adjustment add (adjustment can be negative to subtract),
 * used/wasted always subtract.
 */
function inventoryLogDelta(changeType: string, quantity: number): number {
  if (changeType === 'received' || changeType === 'adjustment') return quantity
  return -Math.abs(quantity)
}

/**
 * Reconstructs beginning/ending inventory for a date range from the
 * inventory_log history (no separate period-snapshot table needed), then
 * applies COGS = Beginning + Purchases - Ending.
 *
 * Simplification: every quantity is valued at the ingredient's *current*
 * cost_per_base_unit, not the price actually paid at the time of each
 * movement — so COGS here reflects today's costs applied retroactively,
 * not a true historical-cost figure. Good enough for a quick gut-check;
 * flag this if you need real historical-cost accounting.
 */
export function useCogsReport(
  organizationId: string | undefined,
  locationId: string | undefined,
  periodStart: string,
  periodEnd: string,
) {
  return useQuery({
    queryKey: ['reports', 'cogs', organizationId, locationId, periodStart, periodEnd],
    enabled: !!organizationId && !!locationId && !!periodStart && !!periodEnd,
    queryFn: async () => {
      const [ingredientsRes, logRes] = await Promise.all([
        supabase
          .from('ingredients')
          .select(
            'id, name, base_unit, cost_per_base_unit, exchange_rate_to_base, inventory_stock(quantity_on_hand)',
          )
          .eq('organization_id', organizationId!)
          .eq('inventory_stock.location_id', locationId!),
        supabase
          .from('inventory_log')
          .select('ingredient_id, change_type, quantity, created_at')
          .eq('organization_id', organizationId!)
          .eq('location_id', locationId!),
      ])
      if (ingredientsRes.error) throw ingredientsRes.error
      if (logRes.error) throw logRes.error

      const periodStartMs = new Date(`${periodStart}T00:00:00.000`).getTime()
      const periodEndMs = new Date(`${periodEnd}T23:59:59.999`).getTime()

      const logByIngredient = new Map<string, typeof logRes.data>()
      for (const entry of logRes.data) {
        const list = logByIngredient.get(entry.ingredient_id) ?? []
        list.push(entry)
        logByIngredient.set(entry.ingredient_id, list)
      }

      return ingredientsRes.data.map((ingredient): CogsLineItem => {
        const currentQty = ingredient.inventory_stock[0]?.quantity_on_hand ?? 0
        const entries = logByIngredient.get(ingredient.id) ?? []

        let netDeltaAfterPeriodEnd = 0
        let netDeltaFromPeriodStart = 0
        let purchasesQty = 0

        for (const entry of entries) {
          const t = new Date(entry.created_at).getTime()
          const delta = inventoryLogDelta(entry.change_type, entry.quantity)
          if (t > periodEndMs) netDeltaAfterPeriodEnd += delta
          if (t >= periodStartMs) netDeltaFromPeriodStart += delta
          if (entry.change_type === 'received' && t >= periodStartMs && t <= periodEndMs) {
            purchasesQty += entry.quantity
          }
        }

        const endingQty = currentQty - netDeltaAfterPeriodEnd
        const beginningQty = currentQty - netDeltaFromPeriodStart
        const unitValue = (ingredient.cost_per_base_unit ?? 0) * ingredient.exchange_rate_to_base

        const beginningValue = beginningQty * unitValue
        const endingValue = endingQty * unitValue
        const purchasesValue = purchasesQty * unitValue

        return {
          ingredientId: ingredient.id,
          name: ingredient.name,
          baseUnit: ingredient.base_unit,
          beginningQty,
          purchasesQty,
          endingQty,
          beginningValue,
          purchasesValue,
          endingValue,
          cogs: beginningValue + purchasesValue - endingValue,
        }
      })
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
