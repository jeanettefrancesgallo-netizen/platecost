import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

function useInvalidateRecipe(recipeId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] })
    queryClient.invalidateQueries({ queryKey: ['recipes'] })
  }
}

export function useAddRecipeItem(recipeId: string) {
  const invalidate = useInvalidateRecipe(recipeId)
  return useMutation({
    mutationFn: async (input: { ingredientId: string; quantity: number; unit: string }) => {
      const { error } = await supabase.from('recipe_items').insert({
        recipe_id: recipeId,
        ingredient_id: input.ingredientId,
        quantity: input.quantity,
        unit: input.unit,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useUpdateRecipeItem(recipeId: string) {
  const invalidate = useInvalidateRecipe(recipeId)
  return useMutation({
    mutationFn: async (input: { id: string; quantity: number; unit: string }) => {
      const { error } = await supabase
        .from('recipe_items')
        .update({ quantity: input.quantity, unit: input.unit })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useDeleteRecipeItem(recipeId: string) {
  const invalidate = useInvalidateRecipe(recipeId)
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipe_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
