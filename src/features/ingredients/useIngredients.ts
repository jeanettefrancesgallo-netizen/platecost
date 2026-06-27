import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface IngredientFilters {
  search: string
  categoryId: string
}

export function useIngredients(organizationId: string | undefined, filters: IngredientFilters) {
  return useQuery({
    queryKey: ['ingredients', organizationId, filters],
    enabled: !!organizationId,
    queryFn: async () => {
      let query = supabase
        .from('ingredients')
        .select('*, ingredient_categories(id, name), suppliers(id, name)')
        .eq('organization_id', organizationId!)
        .order('name')

      if (filters.search.trim()) {
        query = query.ilike('name', `%${filters.search.trim()}%`)
      }
      if (filters.categoryId !== 'all') {
        query = query.eq('category_id', filters.categoryId)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}
