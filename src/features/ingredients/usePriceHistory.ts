import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function usePriceHistory(ingredientId: string | undefined) {
  return useQuery({
    queryKey: ['price-history', ingredientId],
    enabled: !!ingredientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('ingredient_id', ingredientId!)
        .order('changed_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}
