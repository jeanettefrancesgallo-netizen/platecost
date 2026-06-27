import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useCategories(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['categories', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredient_categories')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}
