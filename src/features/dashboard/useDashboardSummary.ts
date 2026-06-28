import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useDashboardSummary(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard-summary', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const [ingredientCount, lowStockRows] = await Promise.all([
        supabase
          .from('ingredients')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId!),
        supabase
          .from('inventory_stock')
          .select('quantity_on_hand, reorder_level')
          .eq('organization_id', organizationId!)
          .gt('reorder_level', 0),
      ])
      if (ingredientCount.error) throw ingredientCount.error
      if (lowStockRows.error) throw lowStockRows.error

      const lowStockCount = lowStockRows.data.filter(
        (row) => row.quantity_on_hand <= row.reorder_level,
      ).length

      return {
        ingredientCount: ingredientCount.count ?? 0,
        lowStockCount,
      }
    },
  })
}
