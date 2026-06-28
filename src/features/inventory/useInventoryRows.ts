import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useInventoryRows(organizationId: string | undefined, locationId: string | undefined) {
  return useQuery({
    queryKey: ['inventory-rows', organizationId, locationId],
    enabled: !!organizationId && !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredients')
        .select(
          'id, name, base_unit, ingredient_categories(name), inventory_stock(quantity_on_hand, par_level, reorder_level)',
        )
        .eq('organization_id', organizationId!)
        .eq('inventory_stock.location_id', locationId!)
        .order('name')
      if (error) throw error

      return data.map((row) => {
        const stock = row.inventory_stock[0]
        return {
          ingredientId: row.id,
          name: row.name,
          baseUnit: row.base_unit,
          categoryName: row.ingredient_categories?.name ?? 'Uncategorized',
          quantityOnHand: stock?.quantity_on_hand ?? 0,
          parLevel: stock?.par_level ?? 0,
          reorderLevel: stock?.reorder_level ?? 0,
        }
      })
    },
  })
}
