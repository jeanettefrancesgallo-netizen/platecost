import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useRecipe(recipeId: string | undefined) {
  return useQuery({
    queryKey: ['recipe', recipeId],
    enabled: !!recipeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select(
          '*, recipe_items(*, ingredients(id, name, base_unit, cost_per_base_unit, exchange_rate_to_base))',
        )
        .eq('id', recipeId!)
        .single()
      if (error) throw error
      return data
    },
  })
}
