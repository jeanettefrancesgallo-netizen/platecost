import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface RecipeFilters {
  search: string
  type: 'food' | 'beverage'
}

export function useRecipes(organizationId: string | undefined, filters: RecipeFilters) {
  return useQuery({
    queryKey: ['recipes', organizationId, filters],
    enabled: !!organizationId,
    queryFn: async () => {
      let query = supabase
        .from('recipes')
        .select(
          '*, recipe_items(quantity, unit, ingredients(base_unit, cost_per_base_unit, exchange_rate_to_base))',
        )
        .eq('organization_id', organizationId!)
        .eq('type', filters.type)
        .order('name')

      if (filters.search.trim()) {
        query = query.ilike('name', `%${filters.search.trim()}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}
